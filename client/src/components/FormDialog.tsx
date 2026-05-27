import { useEffect, useState } from "react";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "select";
  options?: Array<{ label: string; value: string }>;
};

type Props = {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  fields: Field[];
  initialValues: Record<string, string>;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export function FormDialog({ open, title, description, submitLabel, fields, initialValues, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setSaving(false);
  }, [initialValues, open]);

  if (!open) return null;

  const invalid = fields.some((field) => !values[field.name]?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-soft">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          <button className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">{field.label}</span>
              {field.type === "select" ? (
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
                  value={values[field.name] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: event.target.value
                    }))
                  }
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: event.target.value
                    }))
                  }
                />
              )}
            </label>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving || invalid}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit(
                  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim ? value.trim() : value]))
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
