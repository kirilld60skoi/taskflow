import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { ensureWorkspaceMember } from "../lib/permissions";

const router = Router();
router.use(requireAuth);

router.get("/boards/:id", async (request, response) => {
  const board = await prisma.board.findUnique({
    where: { id: request.params.id },
    include: {
      project: {
        include: {
          workspace: true
        }
      },
      columns: {
        include: {
          tasks: {
            include: {
              assignee: {
                select: { id: true, email: true, name: true }
              }
            }
          }
        }
      }
    }
  });

  if (!board) {
    return response.status(404).json({ message: "Board not found" });
  }

  await ensureWorkspaceMember(request.userId!, board.project.workspaceId);

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: board.project.workspaceId },
    include: { user: { select: { id: true, email: true, name: true } } }
  });

  return response.json({ ...board, members });
});

router.post("/boards", async (request, response) => {
  const parsed = z.object({ projectId: z.string(), name: z.string().min(2) }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid board payload" });
  }

  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
  if (!project) {
    return response.status(404).json({ message: "Project not found" });
  }

  await ensureWorkspaceMember(request.userId!, project.workspaceId);

  const board = await prisma.board.create({
    data: {
      ...parsed.data,
      columns: {
        create: [
          { name: "New", position: 0 },
          { name: "In progress", position: 1 },
          { name: "Done", position: 2 }
        ]
      }
    },
    include: { columns: true }
  });

  return response.status(201).json(board);
});

router.delete("/boards/:id", async (request, response) => {
  const board = await prisma.board.findUnique({
    where: { id: request.params.id },
    include: { project: true }
  });

  if (!board) {
    return response.status(404).json({ message: "Board not found" });
  }

  await ensureWorkspaceMember(request.userId!, board.project.workspaceId);
  await prisma.board.delete({ where: { id: board.id } });
  return response.status(204).send();
});

export default router;
