import { clsx } from "clsx";
import { formatDistanceToNowStrict, isPast, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import type { Board, Column, Task } from "../lib/types";

type Props = {
  board: Board;
  onOpenTask: (task: Task | null, columnId: string) => void;
  onRenameColumn: (column: Column) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onCreateColumn: () => Promise<void>;
  onMoveTask: (taskId: string, toColumnId: string, position: number) => Promise<void>;
};

export function BoardView({
  board,
  onOpenTask,
  onRenameColumn,
  onDeleteColumn,
  onCreateColumn,
  onMoveTask
}: Props) {
  return (
    <div className="flex gap-5 overflow-x-auto pb-4">
      {board.columns
        .slice()
        .sort((left, right) => left.position - right.position)
        .map((column) => (
          <section
            key={column.id}
            className="w-80 shrink-0 rounded-3xl bg-white/90 p-4 shadow-soft"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("taskId");
              void onMoveTask(taskId, column.id, column.tasks.length);
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                className="text-left text-lg font-semibold text-ink"
                onClick={() => void onRenameColumn(column)}
              >
                {column.name}
              </button>
              <button className="text-sm text-slate-400" onClick={() => void onDeleteColumn(column.id)}>
                Удалить
              </button>
            </div>

            <div className="space-y-3">
              {column.tasks
                .slice()
                .sort((left, right) => left.position - right.position)
                .map((task) => (
                  <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task, column.id)} />
                ))}
            </div>

            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500"
              onClick={() => onOpenTask(null, column.id)}
            >
              <Plus className="h-4 w-4" />
              Добавить задачу
            </button>
          </section>
        ))}

      <button
        className="flex w-72 shrink-0 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 px-5 py-6 text-sm font-semibold text-slate-500"
        onClick={() => void onCreateColumn()}
      >
        + Добавить колонку
      </button>
    </div>
  );
}

function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const overdue = task.dueDate ? isPast(parseISO(task.dueDate)) && task.status !== "DONE" : false;

  return (
    <button
      draggable
      onDragStart={(event) => event.dataTransfer.setData("taskId", task.id)}
      onClick={onOpen}
      className="w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ink">{task.title}</h3>
        <span
          className={clsx(
            "rounded-full px-2 py-1 text-[11px] font-semibold uppercase",
            task.priority === "HIGH" && "bg-rose-100 text-rose-600",
            task.priority === "MEDIUM" && "bg-amber-100 text-amber-700",
            task.priority === "LOW" && "bg-emerald-100 text-emerald-700"
          )}
        >
          {task.priority}
        </span>
      </div>
      <p className="line-clamp-2 text-sm text-slate-500">{task.description || "Описание пока не добавлено"}</p>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">{task.assignee?.name ?? "Не назначен"}</span>
        {task.dueDate ? (
          <span className={overdue ? "font-semibold text-rose-600" : "text-slate-400"}>
            {formatDistanceToNowStrict(parseISO(task.dueDate), { addSuffix: true })}
          </span>
        ) : null}
      </div>
    </button>
  );
}
