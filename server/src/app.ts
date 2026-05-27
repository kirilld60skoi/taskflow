import "express-async-errors";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth";
import workspaceRoutes from "./routes/workspaces";
import projectRoutes from "./routes/projects";
import boardRoutes from "./routes/boards";
import columnRoutes from "./routes/columns";
import taskRoutes from "./routes/tasks";
import dashboardRoutes from "./routes/dashboard";
import notificationRoutes from "./routes/notifications";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL ?? "http://localhost:3000",
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use("/api", authRoutes);
  app.use("/api", workspaceRoutes);
  app.use("/api", projectRoutes);
  app.use("/api", boardRoutes);
  app.use("/api", columnRoutes);
  app.use("/api", taskRoutes);
  app.use("/api", dashboardRoutes);
  app.use("/api", notificationRoutes);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof Error && error.message.includes("access")) {
      return response.status(403).json({ message: error.message });
    }

    console.error(error);

    return response.status(500).json({ message: "Internal server error" });
  });

  return app;
}
