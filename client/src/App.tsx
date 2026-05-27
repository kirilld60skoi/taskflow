import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "./lib/api";
import type {
  Board,
  BootstrapPayload,
  DashboardPayload,
  Notification,
  Project,
  Task,
  User,
  Workspace,
  WorkspaceMember
} from "./lib/types";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { WorkspaceSettingsPage } from "./pages/WorkspaceSettingsPage";
import { NotificationsMenu } from "./components/NotificationsMenu";
import { BoardView } from "./components/BoardView";
import { TaskModal } from "./components/TaskModal";
import { FormDialog } from "./components/FormDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";

type Session = {
  user: User;
};

type DialogState =
  | { kind: "workspace"; values: { name: string } }
  | { kind: "project"; values: { name: string } }
  | { kind: "board"; values: { name: string; projectId: string } }
  | { kind: "column"; values: { name: string } }
  | { kind: "rename-column"; columnId: string; values: { name: string } }
  | null;

type ConfirmState =
  | { title: string; description: string; confirmLabel: string; onConfirm: () => Promise<void> }
  | null;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [taskModal, setTaskModal] = useState<{ task: Task | null; columnId: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const workspaces = bootstrap?.workspaces ?? [];
  const projects = bootstrap?.projects ?? [];
  const boards = bootstrap?.boards ?? [];
  const notifications = bootstrap?.notifications ?? [];

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadBootstrap();
    void loadDashboard();
  }, [session]);

  useEffect(() => {
    if (!activeWorkspaceId && workspaces[0]) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (workspaces.some((workspace) => workspace.id === activeWorkspaceId)) return;

    setWorkspaceMembers([]);
    setActiveBoard(null);
    setActiveWorkspaceId(workspaces[0]?.id ?? "");

    if (location.pathname.startsWith("/workspace") || location.pathname.startsWith("/boards/")) {
      navigate("/", { replace: true });
    }
  }, [activeWorkspaceId, workspaces, location.pathname, navigate]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void loadMembers(activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function refreshSession() {
    try {
      const user = await api.get<User>("/me");
      setSession({ user });
    } catch {
      setSession(null);
    }
  }

  async function loadBootstrap() {
    try {
      const [workspacesPayload, projectsPayload, notificationsPayload] = await Promise.all([
        api.get<Workspace[]>("/workspaces"),
        api.get<Project[]>("/projects"),
        api.get<Notification[]>("/notifications")
      ]);
      const flattenedBoards = projectsPayload.flatMap((project) => project.boards ?? []);

      setBootstrap({
        workspaces: workspacesPayload,
        projects: projectsPayload,
        boards: flattenedBoards,
        notifications: notificationsPayload
      });
    } catch (bootstrapError) {
      setBootstrap({
        workspaces: [],
        projects: [],
        boards: [],
        notifications: []
      });
      setWorkspaceMembers([]);
      setActiveBoard(null);
      setActiveWorkspaceId("");
      if (bootstrapError instanceof Error) {
        setError(bootstrapError.message);
      }
    }
  }

  async function loadDashboard() {
    try {
      const payload = await api.get<DashboardPayload>("/dashboard");
      setDashboard(payload);
    } catch {
      setDashboard(null);
    }
  }

  async function loadBoard(boardId: string) {
    try {
      const payload = await api.get<Board>(`/boards/${boardId}`);
      setActiveBoard(payload);
      setActiveWorkspaceId(payload.project?.workspace.id ?? activeWorkspaceId);
      setWorkspaceMembers(payload.members);
    } catch (boardError) {
      setActiveBoard(null);
      setWorkspaceMembers([]);
      if (location.pathname.startsWith("/boards/")) {
        navigate("/", { replace: true });
      }
      await loadBootstrap();
      if (boardError instanceof Error) {
        setError(boardError.message);
      }
    }
  }

  async function loadMembers(workspaceId: string) {
    try {
      const members = await api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
      setWorkspaceMembers(members);
    } catch (membersError) {
      setWorkspaceMembers([]);
      await loadBootstrap();
      if (membersError instanceof Error) {
        setError(membersError.message);
      }
    }
  }

  async function handleAuth(mode: "login" | "register", payload: { name?: string; email: string; password: string }) {
    setError("");
    try {
      const user = await api.post<User>(mode === "login" ? "/login" : "/register", payload);
      setSession({ user });
      navigate(location.pathname.startsWith("/join/") ? location.pathname : "/");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Ошибка авторизации");
    }
  }

  async function handleLogout() {
    await api.post("/logout");
    setSession(null);
    setBootstrap(null);
    setDashboard(null);
    setActiveBoard(null);
    navigate("/");
  }

  async function handleCreateWorkspace(values: Record<string, string>) {
    const workspace = await api.post<Workspace>("/workspaces", { name: values.name });
    setActiveWorkspaceId(workspace.id);
    await loadBootstrap();
    setNotice(`Пространство "${workspace.name}" создано`);
    setDialog(null);
  }

  async function handleCreateProject(values: Record<string, string>) {
    if (!activeWorkspaceId) {
      setError("Сначала создайте рабочее пространство.");
      return;
    }
    await api.post("/projects", { name: values.name, workspaceId: activeWorkspaceId });
    await loadBootstrap();
    setNotice("Проект создан");
    setDialog(null);
  }

  async function handleCreateBoard(values: Record<string, string>) {
    const availableProjects = projects.filter((item) => item.workspaceId === activeWorkspaceId);
    if (!availableProjects.length) {
      setError("Сначала создайте проект в этом пространстве.");
      return;
    }
    const board = await api.post<Board>("/boards", {
      projectId: values.projectId,
      name: values.name
    });
    await loadBootstrap();
    setNotice(`Доска "${board.name}" создана`);
    setDialog(null);
    navigate(`/boards/${board.id}`);
  }

  async function handleDeleteProject(projectId: string) {
    await api.delete(`/projects/${projectId}`);
    if (activeBoard && projects.find((project) => project.id === activeBoard.projectId)?.id === projectId) {
      setActiveBoard(null);
      navigate("/");
    }
    await loadBootstrap();
    await loadDashboard();
    setNotice("Проект удалён");
    setConfirmState(null);
  }

  async function handleDeleteBoard(boardId: string) {
    await api.delete(`/boards/${boardId}`);
    if (activeBoard?.id === boardId) {
      setActiveBoard(null);
      navigate("/");
    }
    await loadBootstrap();
    await loadDashboard();
    setNotice("Доска удалена");
    setConfirmState(null);
  }

  async function handleInviteWorkspace() {
    if (!activeWorkspaceId) {
      setError("Сначала выберите рабочее пространство.");
      return;
    }
    const payload = await api.post<{ inviteToken: string; url: string }>(`/workspaces/${activeWorkspaceId}/invite`);
    await navigator.clipboard.writeText(payload.url).catch(() => undefined);
    setBootstrap((current) =>
      current
        ? {
            ...current,
            workspaces: current.workspaces.map((workspace) =>
              workspace.id === activeWorkspaceId ? { ...workspace, inviteToken: payload.inviteToken } : workspace
            )
          }
        : current
    );
    setNotice("Ссылка-приглашение скопирована");
  }

  async function handleRemoveMember(userId: string) {
    if (!activeWorkspaceId) return;
    await api.delete(`/workspaces/${activeWorkspaceId}/members/${userId}`);
    await loadMembers(activeWorkspaceId);
  }

  async function handleReadNotification(id: string) {
    await api.patch(`/notifications/${id}/read`);
    await loadBootstrap();
  }

  async function handleRenameColumn(columnId: string, name: string) {
    await api.put(`/columns/${columnId}`, { name });
    if (activeBoard) await loadBoard(activeBoard.id);
    setNotice("Название колонки обновлено");
  }

  async function handleDeleteColumn(columnId: string) {
    await api.delete(`/columns/${columnId}`);
    if (activeBoard) await loadBoard(activeBoard.id);
    setNotice("Колонка удалена");
  }

  async function handleCreateColumn(values: Record<string, string>) {
    if (!activeBoard) return;
    await api.post("/columns", { boardId: activeBoard.id, name: values.name });
    await loadBoard(activeBoard.id);
    setNotice("Колонка создана");
    setDialog(null);
  }

  async function handleSaveTask(payload: {
    title: string;
    description: string;
    assigneeId: string | null;
    dueDate: string | null;
    priority: Task["priority"];
  }) {
    if (!taskModal) return;
    if (taskModal.task) {
      await api.put(`/tasks/${taskModal.task.id}`, payload);
    } else {
      await api.post("/tasks", { ...payload, columnId: taskModal.columnId });
    }
    if (activeBoard) await loadBoard(activeBoard.id);
    await loadDashboard();
    await loadBootstrap();
    setTaskModal(null);
    setNotice(taskModal.task ? "Задача обновлена" : "Задача создана");
  }

  async function handleDeleteTask() {
    if (!taskModal?.task) return;
    await api.delete(`/tasks/${taskModal.task.id}`);
    if (activeBoard) await loadBoard(activeBoard.id);
    await loadDashboard();
    setTaskModal(null);
    setNotice("Задача удалена");
  }

  async function handleMoveTask(taskId: string, toColumnId: string, position: number) {
    await api.patch(`/tasks/${taskId}/move`, { toColumnId, position });
    if (activeBoard) await loadBoard(activeBoard.id);
    await loadDashboard();
  }

  const members = useMemo(() => workspaceMembers.map((member) => member.user), [workspaceMembers]);
  const visibleBoards = boards.filter((board) =>
    projects.some((project) => project.id === board.projectId && project.workspaceId === activeWorkspaceId)
  );
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  if (!session) {
    return (
      <>
        {error ? <div className="fixed left-6 top-6 z-50 rounded-full bg-rose-100 px-4 py-2 text-sm text-rose-600">{error}</div> : null}
        <AuthPage onSubmit={handleAuth} />
      </>
    );
  }

  return (
    <div className="min-h-screen px-6 py-6">
      {error ? (
        <div className="fixed left-6 top-6 z-50 rounded-full bg-rose-100 px-4 py-2 text-sm text-rose-600 shadow-soft">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="fixed right-6 top-6 z-50 rounded-full bg-emerald-100 px-4 py-2 text-sm text-emerald-700 shadow-soft">
          {notice}
        </div>
      ) : null}
      <div className="grid min-h-[calc(100vh-3rem)] grid-cols-[280px_1fr] gap-6">
        <aside className="rounded-[32px] bg-ink p-6 text-white shadow-soft">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-white/50">TaskFlow</p>
            <h1 className="mt-3 text-3xl font-semibold">{session.user.name}</h1>
            <p className="text-sm text-white/60">{session.user.email}</p>
          </div>

          <select
            className="mt-6 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white outline-none"
            value={activeWorkspaceId}
            onChange={(event) => setActiveWorkspaceId(event.target.value)}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id} className="text-ink">
                {workspace.name}
              </option>
            ))}
          </select>

          <nav className="mt-8 space-y-3">
            <NavLink to="/" label="Дашборд" currentPath={location.pathname} />
            <NavLink to="/workspace" label="Настройки пространства" currentPath={location.pathname} />
            {visibleBoards.map((board) => (
              <NavLink key={board.id} to={`/boards/${board.id}`} label={board.name} currentPath={location.pathname} />
            ))}
          </nav>

          <div className="mt-8 space-y-3">
            <button
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-medium"
              onClick={() => {
                setError("");
                setDialog({ kind: "workspace", values: { name: "" } });
              }}
            >
              + Новое пространство
            </button>
            <button
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-medium"
              onClick={() => {
                setError("");
                if (!activeWorkspaceId) {
                  setError("Сначала создайте рабочее пространство.");
                  return;
                }
                setDialog({ kind: "project", values: { name: "" } });
              }}
            >
              + Новый проект
            </button>
            <button
              className="w-full rounded-2xl bg-accent px-4 py-3 text-left text-sm font-semibold"
              onClick={() => {
                setError("");
                const availableProjects = projects.filter((item) => item.workspaceId === activeWorkspaceId);
                if (!availableProjects.length) {
                  setError("Сначала создайте проект в этом пространстве.");
                  return;
                }
                setDialog({
                  kind: "board",
                  values: {
                    name: "",
                    projectId: availableProjects[0].id
                  }
                });
              }}
            >
              + Новая доска
            </button>
          </div>

          <button className="mt-8 rounded-full bg-white/10 px-4 py-2 text-sm" onClick={() => void handleLogout()}>
            Выйти
          </button>
        </aside>

        <main className="rounded-[32px] bg-white/60 p-6 backdrop-blur">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-ink">Центр управления задачами</h2>
              <p className="text-sm text-slate-500">Следите за сроками, перемещайте карточки и держите команду в курсе.</p>
            </div>
            <NotificationsMenu items={notifications} onRead={handleReadNotification} />
          </header>

          <Routes>
            <Route path="/" element={<DashboardPage dashboard={dashboard} />} />
            <Route
              path="/workspace"
              element={
                <WorkspaceSettingsPage
                  workspace={activeWorkspace}
                  members={workspaceMembers}
                  projects={projects.filter((project) => project.workspaceId === activeWorkspaceId)}
                  onInvite={handleInviteWorkspace}
                  onRemove={handleRemoveMember}
                  onDeleteProject={(projectId) => {
                    setConfirmState({
                      title: "Удалить проект?",
                      description: "Проект будет удалён вместе со всеми его досками.",
                      confirmLabel: "Удалить проект",
                      onConfirm: () => handleDeleteProject(projectId)
                    });
                    return Promise.resolve();
                  }}
                  onDeleteBoard={(boardId) => {
                    setConfirmState({
                      title: "Удалить доску?",
                      description: "Доска будет удалена вместе с колонками и задачами.",
                      confirmLabel: "Удалить доску",
                      onConfirm: () => handleDeleteBoard(boardId)
                    });
                    return Promise.resolve();
                  }}
                />
              }
            />
            <Route
              path="/boards/:boardId"
              element={
                <BoardRoute
                  board={activeBoard}
                  onLoad={loadBoard}
                  onOpenTask={(value) => setTaskModal(value)}
                  onRenameColumn={(columnId, name) => handleRenameColumn(columnId, name)}
                  onDeleteColumn={handleDeleteColumn}
                  onCreateColumn={() => {
                    setDialog({ kind: "column", values: { name: "" } });
                    return Promise.resolve();
                  }}
                  onRequestRenameColumn={(columnId, name) => {
                    setDialog({ kind: "rename-column", columnId, values: { name } });
                  }}
                  onMoveTask={handleMoveTask}
                />
              }
            />
            <Route path="/join/:workspaceId/:token" element={<JoinRoute onJoined={loadBootstrap} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <TaskModal
        open={Boolean(taskModal)}
        task={taskModal?.task ?? null}
        members={members}
        onClose={() => setTaskModal(null)}
        onSave={handleSaveTask}
        onDelete={taskModal?.task ? handleDeleteTask : undefined}
      />

      <FormDialog
        open={Boolean(dialog)}
        title={
          dialog?.kind === "workspace"
            ? "Новое пространство"
            : dialog?.kind === "project"
              ? "Новый проект"
              : dialog?.kind === "board"
                ? "Новая доска"
                : dialog?.kind === "rename-column"
                  ? "Переименовать колонку"
                  : "Новая колонка"
        }
        description={
          dialog?.kind === "workspace"
            ? "Придумайте название для рабочего пространства команды."
            : dialog?.kind === "project"
              ? "Создайте проект внутри текущего рабочего пространства."
              : dialog?.kind === "board"
                ? "Выберите проект и задайте название доски."
                : dialog?.kind === "rename-column"
                  ? "Введите новое название колонки."
                  : "Добавьте новую колонку на доску."
        }
        submitLabel={
          dialog?.kind === "rename-column"
            ? "Сохранить"
            : dialog?.kind === "board"
              ? "Создать доску"
              : dialog?.kind === "project"
                ? "Создать проект"
                : dialog?.kind === "workspace"
                  ? "Создать пространство"
                  : "Создать колонку"
        }
        fields={
          dialog?.kind === "board"
            ? [
                {
                  name: "projectId",
                  label: "Проект",
                  type: "select",
                  options: projects
                    .filter((project) => project.workspaceId === activeWorkspaceId)
                    .map((project) => ({ label: project.name, value: project.id }))
                },
                {
                  name: "name",
                  label: "Название доски",
                  placeholder: "Например, Разработка"
                }
              ]
            : [
                {
                  name: "name",
                  label:
                    dialog?.kind === "workspace"
                      ? "Название пространства"
                      : dialog?.kind === "project"
                        ? "Название проекта"
                        : "Название",
                  placeholder:
                    dialog?.kind === "workspace"
                      ? "Например, Product Team"
                      : dialog?.kind === "project"
                        ? "Например, MVP TaskFlow"
                        : "Введите название"
                }
              ]
        }
        initialValues={dialog?.values ?? { name: "" }}
        onClose={() => setDialog(null)}
        onSubmit={async (values) => {
          if (!dialog) return;
          if (dialog.kind === "workspace") return handleCreateWorkspace(values);
          if (dialog.kind === "project") return handleCreateProject(values);
          if (dialog.kind === "board") return handleCreateBoard(values);
          if (dialog.kind === "column") return handleCreateColumn(values);
          return handleRenameColumn(dialog.columnId, values.name);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel ?? ""}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return;
          await confirmState.onConfirm();
        }}
      />
    </div>
  );
}

function BoardRoute({
  board,
  onLoad,
  onOpenTask,
  onRenameColumn,
  onDeleteColumn,
  onCreateColumn,
  onRequestRenameColumn,
  onMoveTask
}: {
  board: Board | null;
  onLoad: (boardId: string) => Promise<void>;
  onOpenTask: (state: { task: Task | null; columnId: string } | null) => void;
  onRenameColumn: (columnId: string, name: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onCreateColumn: () => Promise<void>;
  onRequestRenameColumn: (columnId: string, name: string) => void;
  onMoveTask: (taskId: string, toColumnId: string, position: number) => Promise<void>;
}) {
  const { boardId } = useParams();

  useEffect(() => {
    if (boardId) {
      void onLoad(boardId);
    }
  }, [boardId]);

  if (!board) {
    return <div className="rounded-3xl bg-white p-8 shadow-soft">Загружаем доску...</div>;
  }

  return (
    <BoardView
      board={board}
      onOpenTask={(task, columnId) => onOpenTask({ task, columnId })}
      onRenameColumn={async (column) => onRequestRenameColumn(column.id, column.name)}
      onDeleteColumn={onDeleteColumn}
      onCreateColumn={onCreateColumn}
      onMoveTask={onMoveTask}
    />
  );
}

function JoinRoute({ onJoined }: { onJoined: () => Promise<void> }) {
  const { workspaceId, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!workspaceId || !token) return;
    void (async () => {
      await api.post("/workspaces/join", { workspaceId, token });
      await onJoined();
      navigate("/workspace");
    })();
  }, [workspaceId, token]);

  return <div className="rounded-3xl bg-white p-8 shadow-soft">Подключаемся к пространству...</div>;
}

function NavLink({ to, label, currentPath }: { to: string; label: string; currentPath: string }) {
  const active = currentPath === to;
  return (
    <Link
      to={to}
      className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
        active ? "bg-white text-ink" : "bg-white/10 text-white/80 hover:bg-white/15"
      }`}
    >
      {label}
    </Link>
  );
}
