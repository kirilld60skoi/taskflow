import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { ensureWorkspaceMember } from "../lib/permissions";

const router = Router();
router.use(requireAuth);

router.get("/projects", async (request, response) => {
  const workspaceMemberships = await prisma.workspaceMember.findMany({
    where: { userId: request.userId! },
    select: { workspaceId: true }
  });
  const workspaceIds = workspaceMemberships.map((membership) => membership.workspaceId);

  const projects = await prisma.project.findMany({
    where: { workspaceId: { in: workspaceIds } },
    include: { boards: true }
  });

  return response.json(projects);
});

router.post("/projects", async (request, response) => {
  const parsed = z.object({ name: z.string().min(2), workspaceId: z.string() }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid project payload" });
  }

  await ensureWorkspaceMember(request.userId!, parsed.data.workspaceId);
  const project = await prisma.project.create({ data: parsed.data });
  return response.status(201).json(project);
});

router.delete("/projects/:id", async (request, response) => {
  const project = await prisma.project.findUnique({ where: { id: request.params.id } });
  if (!project) {
    return response.status(404).json({ message: "Project not found" });
  }

  await ensureWorkspaceMember(request.userId!, project.workspaceId);
  await prisma.project.delete({ where: { id: project.id } });
  return response.status(204).send();
});

export default router;
