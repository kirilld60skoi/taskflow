import { isPast, parseISO } from "date-fns";
import type { DashboardPayload, Task } from "../lib/types";

type Props = {
  dashboard: DashboardPayload | null;
};

export function DashboardPage({ dashboard }: Props) {
  if (!dashboard) {
    return <div className="rounded-3xl bg-white p-8 shadow-soft">Выберите рабочее пространство или создайте первую задачу.</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <TaskGroup title="Мои задачи" tasks={dashboard.myTasks} />
      <TaskGroup title="Просроченные" tasks={dashboard.overdueTasks} highlight="overdue" />
      <TaskGroup title="Скоро дедлайн (3 дня)" tasks={dashboard.upcomingTasks} />
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  highlight
}: {
  title: string;
  tasks: Task[];
  highlight?: "overdue";
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{tasks.length}</span>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => {
          const overdue = task.dueDate ? isPast(parseISO(task.dueDate)) && task.status !== "DONE" : false;
          return (
            <article key={task.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-ink">{task.title}</div>
              <div className="mt-1 text-sm text-slate-500">{task.description || "Без описания"}</div>
              <div className={`mt-3 text-xs ${highlight === "overdue" || overdue ? "text-rose-600" : "text-slate-400"}`}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Без дедлайна"}
              </div>
            </article>
          );
        })}
        {tasks.length === 0 ? <p className="text-sm text-slate-400">В этом разделе пока нет задач.</p> : null}
      </div>
    </section>
  );
}
