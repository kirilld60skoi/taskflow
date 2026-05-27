import { Bell } from "lucide-react";
import type { Notification } from "../lib/types";

type Props = {
  items: Notification[];
  onRead: (id: string) => Promise<void>;
};

export function NotificationsMenu({ items, onRead }: Props) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-white px-4 py-2 shadow-soft">
        <Bell className="h-4 w-4" />
        <span className="text-sm font-medium">Уведомления</span>
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-white">
          {items.filter((item) => !item.isRead).length}
        </span>
      </summary>
      <div className="absolute right-0 z-30 mt-3 w-96 rounded-3xl bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-ink">Входящие</h3>
        </div>
        <div className="max-h-96 space-y-3 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Пока уведомлений нет.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-2xl p-4 text-left text-sm transition ${
                  item.isRead ? "bg-slate-50 text-slate-500" : "bg-amber-50 text-ink"
                }`}
                onClick={() => onRead(item.id)}
              >
                <div className="font-medium">{item.message}</div>
                <div className="mt-1 text-xs">{new Date(item.createdAt).toLocaleString()}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </details>
  );
}
