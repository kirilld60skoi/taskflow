import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/notifications", async (request, response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: request.userId! },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return response.json(notifications);
});

router.patch("/notifications/:id/read", async (request, response) => {
  const existing = await prisma.notification.findUnique({
    where: { id: request.params.id }
  });

  if (!existing) {
    return response.status(404).json({ message: "Notification not found" });
  }

  if (existing.userId !== request.userId) {
    return response.status(403).json({ message: "Notification access denied" });
  }

  const notification = await prisma.notification.update({
    where: { id: request.params.id },
    data: { isRead: true }
  });

  return response.json(notification);
});

export default router;
