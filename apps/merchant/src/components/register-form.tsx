"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthResult } from "@/lib/auth-actions";
import { btnLime, inputCls } from "@/components/ui";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(register, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Business name
        <input name="businessName" className={inputCls} required autoFocus />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Your name
        <input name="fullName" className={inputCls} required />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Phone
        <input name="phone" inputMode="tel" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Email
        <input name="email" type="email" className={inputCls} required />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Password
        <input name="password" type="password" className={inputCls} required minLength={8} />
      </label>
      {state.error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{state.error}</p>
      ) : null}
      <button type="submit" className={`${btnLime} py-2.5`} disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-slate">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-pine hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
