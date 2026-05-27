import { TaskStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { ensureWorkspaceMember } from "../lib/permissions";

const router = Router();
router.use(requireAuth);

router.post("/columns", async (request, response) => {
  const parsed = z.object({ boardId: z.string(), name: z.string().min(2) }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid column payload" });
  }

  const board = await prisma.board.findUnique({
    where: { id: parsed.data.boardId },
    include: { project: true, columns: true }
  });
  if (!board) {
    return response.status(404).json({ message: "Board not found" });
  }

  await ensureWorkspaceMember(request.userId!, board.project.workspaceId);
  const nextPosition = board.columns.reduce((max, column) => Math.max(max, column.position), -1) + 1;
  const column = await prisma.column.create({
    data: {
      boardId: board.id,
      name: parsed.data.name,
      position: nextPosition
    }
  });
  return response.status(201).json(column);
});

router.put("/columns/:id", async (request, response) => {
  const parsed = z.object({ name: z.string().min(2) }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Column name is required" });
  }

  const column = await prisma.column.findUnique({
    where: { id: request.params.id },
    include: { board: { include: { project: true } } }
  });
  if (!column) {
    return response.status(404).json({ message: "Column not found" });
  }

  await ensureWorkspaceMember(request.userId!, column.board.project.workspaceId);
  const updated = await prisma.$transaction(async (tx) => {
    const nextStatus = deriveStatus(parsed.data.name);
    const renamedColumn = await tx.column.update({
      where: { id: column.id },
      data: { name: parsed.data.name }
    });

    await tx.task.updateMany({
      where: { columnId: column.id },
      data: { status: nextStatus }
    });

    return renamedColumn;
  });
  return response.json(updated);
});

router.delete("/columns/:id", async (request, response) => {
  const column = await prisma.column.findUnique({
    where: { id: request.params.id },
    include: { board: { include: { project: true } } }
  });
  if (!column) {
    return response.status(404).json({ message: "Column not found" });
  }

  await ensureWorkspaceMember(request.userId!, column.board.project.workspaceId);
  await prisma.$transaction([
    prisma.column.delete({ where: { id: column.id } }),
    prisma.column.updateMany({
      where: {
        boardId: column.boardId,
        position: { gt: column.position }
      },
      data: {
        position: { decrement: 1 }
      }
    })
  ]);
  return response.status(204).send();
});

export default router;

function deriveStatus(columnName: string) {
  const normalized = columnName.toLowerCase();
  if (normalized.includes("done") || normalized.includes("gotov")) {
    return TaskStatus.DONE;
  }
  if (normalized.includes("progress") || normalized.includes("rabot")) {
    return TaskStatus.IN_PROGRESS;
  }
  return TaskStatus.TODO;
}
