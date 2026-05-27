import { Prisma, TaskStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { ensureWorkspaceMember } from "../lib/permissions";

const router = Router();
router.use(requireAuth);

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().default(""),
  assigneeId: z.string().nullable().optional(),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Due date is invalid"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
});

router.get("/tasks", async (request, response) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: request.userId! },
    select: { workspaceId: true }
  });
  const workspaceIds = memberships.map((membership) => membership.workspaceId);

  const tasks = await prisma.task.findMany({
    where: {
      column: {
        board: {
          project: {
            workspaceId: {
              in: workspaceIds
            }
          }
        }
      },
      assigneeId: request.query.assignee === "me" ? request.userId! : undefined
    },
    include: {
      assignee: {
        select: { id: true, email: true, name: true }
      }
    }
  });

  return response.json(tasks);
});

router.post("/tasks", async (request, response) => {
  const parsed = taskSchema.extend({ columnId: z.string() }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid task payload" });
  }

  const column = await prisma.column.findUnique({
    where: { id: parsed.data.columnId },
    include: { board: { include: { project: true } }, tasks: true }
  });
  if (!column) {
    return response.status(404).json({ message: "Column not found" });
  }

  await ensureWorkspaceMember(request.userId!, column.board.project.workspaceId);
  await ensureAssigneeInWorkspace(parsed.data.assigneeId ?? null, column.board.project.workspaceId, response);
  if (response.headersSent) {
    return;
  }

  const task = await prisma.task.create({
    data: {
      columnId: parsed.data.columnId,
      title: parsed.data.title,
      description: parsed.data.description,
      assigneeId: parsed.data.assigneeId ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: parsed.data.priority,
      position: column.tasks.length,
      status: deriveStatus(column.name)
    },
    include: {
      assignee: {
        select: { id: true, email: true, name: true }
      }
    }
  });

  await prisma.taskHistory.create({
    data: {
      taskId: task.id,
      userId: request.userId!,
      action: "TASK_CREATED"
    }
  });

  await createAssignmentNotification(task.assigneeId, request.userId!, `You were assigned to "${task.title}"`);

  return response.status(201).json(task);
});

router.put("/tasks/:id", async (request, response) => {
  const parsed = taskSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid task payload" });
  }

  const existingTask = await prisma.task.findUnique({
    where: { id: request.params.id },
    include: { column: { include: { board: { include: { project: true } } } } }
  });
  if (!existingTask) {
    return response.status(404).json({ message: "Task not found" });
  }

  await ensureWorkspaceMember(request.userId!, existingTask.column.board.project.workspaceId);
  await ensureAssigneeInWorkspace(parsed.data.assigneeId ?? null, existingTask.column.board.project.workspaceId, response);
  if (response.headersSent) {
    return;
  }

  const task = await prisma.task.update({
    where: { id: existingTask.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      assigneeId: parsed.data.assigneeId ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: parsed.data.priority
    },
    include: {
      assignee: {
        select: { id: true, email: true, name: true }
      }
    }
  });

  await prisma.taskHistory.create({
    data: {
      taskId: task.id,
      userId: request.userId!,
      action: "TASK_UPDATED"
    }
  });

  if (existingTask.assigneeId !== task.assigneeId) {
    await createAssignmentNotification(task.assigneeId, request.userId!, `You were assigned to "${task.title}"`);
  }

  return response.json(task);
});

router.delete("/tasks/:id", async (request, response) => {
  const task = await prisma.task.findUnique({
    where: { id: request.params.id },
    include: { column: { include: { board: { include: { project: true } } } } }
  });
  if (!task) {
    return response.status(404).json({ message: "Task not found" });
  }

  await ensureWorkspaceMember(request.userId!, task.column.board.project.workspaceId);
  await prisma.task.delete({ where: { id: task.id } });
  return response.status(204).send();
});

router.patch("/tasks/:id/move", async (request, response) => {
  const parsed = z.object({ toColumnId: z.string(), position: z.number().int().nonnegative() }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid move payload" });
  }

  const task = await prisma.task.findUnique({
    where: { id: request.params.id },
    include: { column: { include: { board: { include: { project: true } } } } }
  });
  const destination = await prisma.column.findUnique({
    where: { id: parsed.data.toColumnId },
    include: { board: { include: { project: true } } }
  });

  if (!task || !destination) {
    return response.status(404).json({ message: "Task or destination column not found" });
  }

  await ensureWorkspaceMember(request.userId!, task.column.board.project.workspaceId);
  await ensureWorkspaceMember(request.userId!, destination.board.project.workspaceId);
  if (task.column.boardId !== destination.boardId) {
    return response.status(400).json({ message: "Tasks can only be moved within the same board" });
  }

  const sourceSiblings = await prisma.task.findMany({
    where: { columnId: task.columnId },
    orderBy: { position: "asc" }
  });
  const destinationSiblings =
    task.columnId === destination.id
      ? sourceSiblings
      : await prisma.task.findMany({ where: { columnId: destination.id }, orderBy: { position: "asc" } });

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.taskHistory.create({
      data: {
        taskId: task.id,
        userId: request.userId!,
        action: `TASK_MOVED:${destination.id}`
      }
    })
  ];

  if (task.columnId === destination.id) {
    const reordered = sourceSiblings.filter((item) => item.id !== task.id);
    reordered.splice(Math.min(parsed.data.position, reordered.length), 0, task);

    operations.push(
      ...reordered.map((item, index) =>
        prisma.task.update({
          where: { id: item.id },
          data: {
            position: index,
            status: deriveStatus(destination.name)
          }
        })
      )
    );
  } else {
    const nextSource = sourceSiblings.filter((item) => item.id !== task.id);
    const nextDestination = destinationSiblings.filter((item) => item.id !== task.id);
    nextDestination.splice(Math.min(parsed.data.position, nextDestination.length), 0, {
      ...task,
      columnId: destination.id
    });

    operations.push(
      ...nextSource.map((item, index) =>
        prisma.task.update({
          where: { id: item.id },
          data: { position: index }
        })
      ),
      ...nextDestination.map((item, index) =>
        prisma.task.update({
          where: { id: item.id },
          data: {
            columnId: destination.id,
            position: index,
            status: deriveStatus(destination.name)
          }
        })
      )
    );
  }

  await prisma.$transaction(operations);

  return response.status(204).send();
});

export default router;

function deriveStatus(columnName: string) {
  const normalized = columnName.toLowerCase();
  if (normalized.includes("done") || normalized.includes("gotov")) return TaskStatus.DONE;
  if (normalized.includes("progress") || normalized.includes("rabot")) {
    return TaskStatus.IN_PROGRESS;
  }
  return TaskStatus.TODO;
}

async function createAssignmentNotification(assigneeId: string | null, actorId: string, message: string) {
  if (!assigneeId || assigneeId === actorId) {
    return;
  }

  await prisma.notification.create({
    data: {
      userId: assigneeId,
      message
    }
  });
}

async function ensureAssigneeInWorkspace(
  assigneeId: string | null,
  workspaceId: string,
  response: import("express").Response
) {
  if (!assigneeId) {
    return;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: assigneeId
      }
    }
  });

  if (!membership) {
    response.status(400).json({ message: "Assignee must be a workspace member" });
  }
}
