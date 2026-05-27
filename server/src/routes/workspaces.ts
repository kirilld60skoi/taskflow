import { randomBytes } from "node:crypto";
import { Router } from "express";
import { Prisma, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { ensureWorkspaceMember, ensureWorkspaceOwner } from "../lib/permissions";

const router = Router();
router.use(requireAuth);

router.get("/workspaces", async (request, response) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: request.userId },
    include: {
      workspace: true
    }
  });

  return response.json(
    memberships.map((membership) => ({
      ...membership.workspace,
      currentRole: membership.role
    }))
  );
});

router.post("/workspaces", async (request, response) => {
  const parsed = z.object({ name: z.string().min(2) }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Workspace name is required" });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      ownerId: request.userId!,
      members: {
        create: {
          userId: request.userId!,
          role: WorkspaceRole.OWNER
        }
      }
    }
  });

  return response.status(201).json(workspace);
});

router.get("/workspaces/:id/members", async (request, response) => {
  await ensureWorkspaceMember(request.userId!, request.params.id);
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: request.params.id },
    include: { user: { select: { id: true, email: true, name: true } } }
  });
  return response.json(members);
});

router.post("/workspaces/:id/invite", async (request, response) => {
  await ensureWorkspaceOwner(request.userId!, request.params.id);
  const inviteToken = randomBytes(20).toString("hex");
  await prisma.workspace.update({
    where: { id: request.params.id },
    data: { inviteToken }
  });
  return response.json({ inviteToken, url: `${process.env.CLIENT_URL}/join/${request.params.id}/${inviteToken}` });
});

router.post("/workspaces/join", async (request, response) => {
  const parsed = z.object({ workspaceId: z.string(), token: z.string() }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invite payload is invalid" });
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: parsed.data.workspaceId } });
  if (!workspace || workspace.inviteToken !== parsed.data.token) {
    return response.status(400).json({ message: "Invite link is invalid" });
  }

  const existingMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: request.userId!
      }
    }
  });

  if (!existingMembership) {
    try {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: request.userId!,
          role: WorkspaceRole.MEMBER
        }
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
    }
  }

  return response.status(204).send();
});

router.delete("/workspaces/:id/members/:userId", async (request, response) => {
  await ensureWorkspaceOwner(request.userId!, request.params.id);
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: request.params.id,
        userId: request.params.userId
      }
    }
  });

  if (!membership) {
    return response.status(404).json({ message: "Member not found" });
  }

  if (membership.role === WorkspaceRole.OWNER) {
    return response.status(400).json({ message: "Workspace owner cannot be removed" });
  }

  await prisma.$transaction([
    prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: request.params.id,
          userId: request.params.userId
        }
      }
    }),
    prisma.task.updateMany({
      where: {
        assigneeId: request.params.userId,
        column: {
          board: {
            project: {
              workspaceId: request.params.id
            }
          }
        }
      },
      data: {
        assigneeId: null
      }
    })
  ]);
  return response.status(204).send();
});

export default router;
