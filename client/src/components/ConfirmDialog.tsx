type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDialog({ open, title, description, confirmLabel, onClose, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] bg-white p-8 shadow-soft">
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-3 text-sm text-slate-500">{description}</p>

        <div className="mt-8 flex justify-end gap-3">
          <button className="rounded-full bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
            onClick={async () => {
              await onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
