export type User = {
  id: string;
  email: string;
  name: string;
};

export type WorkspaceMember = {
  id: string;
  role: "OWNER" | "MEMBER";
  user: User;
};

export type Workspace = {
  id: string;
  name: string;
  inviteToken?: string | null;
  currentRole?: "OWNER" | "MEMBER";
  members?: WorkspaceMember[];
};

export type Project = {
  id: string;
  name: string;
  workspaceId: string;
  boards?: Array<Pick<Board, "id" | "name" | "projectId">>;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  dueDate: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  position: number;
  columnId: string;
  assignee?: User | null;
};

export type Column = {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
};

export type Board = {
  id: string;
  name: string;
  projectId: string;
  project?: Project & { workspace: Workspace };
  columns: Column[];
  members: WorkspaceMember[];
};

export type Notification = {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type DashboardPayload = {
  myTasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
};

export type BootstrapPayload = {
  workspaces: Workspace[];
  projects: Project[];
  boards: Array<Pick<Board, "id" | "name" | "projectId">>;
  notifications: Notification[];
};
