import { TaskStatus } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", async (request, response) => {
  const now = new Date();
  const inThreeDays = new Date(now);
  inThreeDays.setDate(now.getDate() + 3);

  const commonWhere = {
    assigneeId: request.userId!,
    status: {
      not: TaskStatus.DONE
    }
  };

  const [myTasks, overdueTasks, upcomingTasks] = await Promise.all([
    prisma.task.findMany({
      where: commonWhere,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: { assignee: { select: { id: true, email: true, name: true } } }
    }),
    prisma.task.findMany({
      where: {
        ...commonWhere,
        dueDate: { lt: now }
      },
      orderBy: { dueDate: "asc" },
      include: { assignee: { select: { id: true, email: true, name: true } } }
    }),
    prisma.task.findMany({
      where: {
        ...commonWhere,
        dueDate: { gte: now, lte: inThreeDays }
      },
      orderBy: { dueDate: "asc" },
      include: { assignee: { select: { id: true, email: true, name: true } } }
    })
  ]);

  return response.json({ myTasks, overdueTasks, upcomingTasks });
});

export default router;
