import { useEffect, useState } from "react";
import type { Task, User } from "../lib/types";

type Props = {
  open: boolean;
  task?: Task | null;
  members: User[];
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    assigneeId: string | null;
    dueDate: string | null;
    priority: Task["priority"];
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function TaskModal({ open, task, members, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
    priority: "MEDIUM" as Task["priority"]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigneeId: task?.assigneeId ?? "",
      dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : "",
      priority: task?.priority ?? "MEDIUM"
    });
  }, [task, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">{task ? "Карточка задачи" : "Новая задача"}</h2>
            <p className="text-sm text-slate-500">Заполните название, описание, исполнителя и дедлайн.</p>
          </div>
          <button className="rounded-full bg-slate-100 px-4 py-2 text-sm" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className="grid gap-5">
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
            placeholder="Название задачи"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <textarea
            className="min-h-32 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
            placeholder="Описание"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="grid grid-cols-3 gap-4">
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
              value={form.assigneeId}
              onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))}
            >
              <option value="">Не назначен</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            />
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: event.target.value as Task["priority"] }))
              }
            >
              <option value="LOW">Низкий</option>
              <option value="MEDIUM">Средний</option>
              <option value="HIGH">Высокий</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div>
            {task && onDelete ? (
              <button
                className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600"
                onClick={async () => {
                  setSaving(true);
                  await onDelete();
                  setSaving(false);
                }}
              >
                Удалить задачу
              </button>
            ) : null}
          </div>
          <button
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
            disabled={saving || !form.title.trim()}
            onClick={async () => {
              setSaving(true);
              await onSave({
                title: form.title,
                description: form.description,
                assigneeId: form.assigneeId || null,
                dueDate: form.dueDate || null,
                priority: form.priority
              });
              setSaving(false);
            }}
          >
            {saving ? "Сохраняем..." : task ? "Сохранить" : "Создать задачу"}
          </button>
        </div>
      </div>
    </div>
  );
}
