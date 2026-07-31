"use client";

import { useActionState } from "react";
import { login, type AuthResult } from "@/lib/auth-actions";
import { btnLime, inputCls } from "@/components/ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(login, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Email
        <input name="email" type="email" className={inputCls} required autoFocus />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Password
        <input name="password" type="password" className={inputCls} required />
      </label>
      {state.error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{state.error}</p>
      ) : null}
      <button type="submit" className={`${btnLime} py-2.5`} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-xs text-slate">
        New riders apply through the MELD website — once approved, MELD emails you a login.
      </p>
    </form>
  );
}
