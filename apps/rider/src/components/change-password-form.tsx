"use client";

import { useActionState, useState } from "react";
import { changePassword, type ChangePasswordResult } from "@/lib/auth-actions";
import { btnLime, inputCls } from "@/components/ui";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ChangePasswordResult, FormData>(changePassword, {
    error: null,
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-slate">For security, you must set your own password before continuing.</p>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Current password
        <input name="currentPassword" type="password" className={inputCls} required autoFocus />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        New password
        <input
          name="newPassword"
          type="password"
          className={inputCls}
          minLength={8}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          className={inputCls}
          minLength={8}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>
      {mismatch ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          Passwords do not match.
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={`${btnLime} py-2.5`} disabled={pending || mismatch}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
