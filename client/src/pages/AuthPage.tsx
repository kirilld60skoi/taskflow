import { useState } from "react";

type Props = {
  onSubmit: (mode: "login" | "register", payload: { name?: string; email: string; password: string }) => Promise<void>;
};

export function AuthPage({ onSubmit }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  return (
    <div className="flex min-h-screen items-center justify-center px-10 py-16">
      <div className="grid w-full max-w-6xl grid-cols-[1.2fr_0.8fr] gap-8">
        <section className="rounded-[36px] bg-ink p-12 text-white shadow-soft">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-white/60">TaskFlow MVP</p>
          <h1 className="max-w-xl font-sans text-5xl font-semibold leading-tight">
            Командная доска задач с рабочими пространствами, Kanban и дедлайнами.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            Создавайте рабочие пространства, приглашайте коллег, назначайте задачи и держите сроки под контролем.
          </p>
        </section>

        <section className="rounded-[36px] bg-white p-10 shadow-soft">
          <div className="mb-8 flex gap-3">
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-ink text-white" : "bg-slate-100"}`}
              onClick={() => setMode("login")}
            >
              Вход
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-ink text-white" : "bg-slate-100"}`}
              onClick={() => setMode("register")}
            >
              Регистрация
            </button>
          </div>

          <div className="space-y-4">
            {mode === "register" ? (
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
                placeholder="Ваше имя"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            ) : null}
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <input
              type="password"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-accent"
              placeholder="Пароль"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </div>

          <button
            className="mt-6 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white"
            onClick={() =>
              onSubmit(mode, {
                email: form.email,
                password: form.password,
                ...(mode === "register" && form.name.trim() ? { name: form.name.trim() } : {})
              })
            }
          >
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </section>
      </div>
    </div>
  );
}
