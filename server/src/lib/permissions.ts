import { WorkspaceRole } from "@prisma/client";
import { prisma } from "./prisma";

export async function ensureWorkspaceMember(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId
      }
    }
  });

  if (!membership) {
    throw new Error("Workspace access denied");
  }

  return membership;
}

export async function ensureWorkspaceOwner(userId: string, workspaceId: string) {
  const membership = await ensureWorkspaceMember(userId, workspaceId);

  if (membership.role !== WorkspaceRole.OWNER) {
    throw new Error("Owner access required");
  }
}
