import type { Project, Workspace, WorkspaceMember } from "../lib/types";

type Props = {
  workspace: Workspace | null;
  members: WorkspaceMember[];
  projects: Project[];
  onInvite: () => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onDeleteBoard: (boardId: string) => Promise<void>;
};

export function WorkspaceSettingsPage({
  workspace,
  members,
  projects,
  onInvite,
  onRemove,
  onDeleteProject,
  onDeleteBoard
}: Props) {
  if (!workspace) {
    return <div className="rounded-3xl bg-white p-8 shadow-soft">Выберите рабочее пространство для управления участниками.</div>;
  }

  const canManageWorkspace = workspace.currentRole === "OWNER";

  return (
    <section className="rounded-3xl bg-white p-6 shadow-soft">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{workspace.name}</h2>
          <p className="text-sm text-slate-500">Приглашайте участников по ссылке и управляйте доступом.</p>
        </div>
        {canManageWorkspace ? (
          <button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={() => void onInvite()}>
            Создать ссылку-приглашение
          </button>
        ) : null}
      </div>

      {canManageWorkspace && workspace.inviteToken ? (
        <div className="mb-6 rounded-2xl bg-mist p-4 text-sm">
          <div className="font-medium text-ink">Ссылка-приглашение</div>
          <div className="mt-2 break-all text-slate-600">{`${window.location.origin}/join/${workspace.id}/${workspace.inviteToken}`}</div>
        </div>
      ) : null}

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <div>
              <div className="font-medium text-ink">{member.user.name}</div>
              <div className="text-sm text-slate-500">{member.user.email}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{member.role}</span>
              {canManageWorkspace && member.role !== "OWNER" ? (
                <button className="text-sm font-medium text-rose-600" onClick={() => void onRemove(member.user.id)}>
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-lg font-semibold text-ink">Проекты</h3>
          <div className="mt-4 space-y-3">
            {projects.length === 0 ? <p className="text-sm text-slate-400">Проектов пока нет.</p> : null}
            {projects.map((project) => (
              <div key={project.id} className="rounded-2xl bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-ink">{project.name}</div>
                    <div className="text-sm text-slate-500">{project.boards?.length ?? 0} досок</div>
                  </div>
                  {canManageWorkspace ? (
                    <button className="text-sm font-medium text-rose-600" onClick={() => void onDeleteProject(project.id)}>
                      Удалить проект
                    </button>
                  ) : null}
                </div>
                {project.boards?.length ? (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {project.boards.map((board) => (
                      <div key={board.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{board.name}</span>
                        {canManageWorkspace ? (
                          <button className="font-medium text-rose-600" onClick={() => void onDeleteBoard(board.id)}>
                            Удалить доску
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
