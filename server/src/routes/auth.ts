import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { clearAuthCookies, setAuthCookies } from "../lib/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).optional()
});

router.post("/register", async (request, response) => {
  const parsed = credentialsSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid registration payload" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return response.status(409).json({ message: "Email already registered" });
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name ?? parsed.data.email.split("@")[0],
      passwordHash: await bcrypt.hash(parsed.data.password, 10)
    }
  });

  setAuthCookies(response, user.id);
  return response.status(201).json({ id: user.id, email: user.email, name: user.name });
});

router.post("/login", async (request, response) => {
  const parsed = credentialsSchema.omit({ name: true }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid login payload" });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return response.status(401).json({ message: "Invalid email or password" });
  }

  setAuthCookies(response, user.id);
  return response.json({ id: user.id, email: user.email, name: user.name });
});

router.post("/logout", requireAuth, (_request, response) => {
  clearAuthCookies(response);
  return response.status(204).send();
});

router.get("/me", requireAuth, async (request, response) => {
  const user = await prisma.user.findUnique({ where: { id: request.userId } });
  if (!user) {
    return response.status(404).json({ message: "User not found" });
  }
  return response.json({ id: user.id, email: user.email, name: user.name });
});

export default router;
