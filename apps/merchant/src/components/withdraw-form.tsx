"use client";

import { useActionState } from "react";
import { requestWithdrawal, type WithdrawResult } from "@/lib/actions";
import { btnLime, inputCls } from "@/components/ui";

export function WithdrawForm({ bankLabel }: { bankLabel: string }) {
  const [state, formAction, pending] = useActionState<WithdrawResult, FormData>(requestWithdrawal, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Amount (₦)
        <input name="amountNaira" className={inputCls} inputMode="decimal" placeholder="e.g. 20000" required />
      </label>
      <p className="text-xs text-slate">Paid to {bankLabel} via the payment partner.</p>
      {state.error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-semibold text-green-900">
          Withdrawal requested — you&apos;ll be notified when it&apos;s paid.
        </p>
      ) : null}
      <button type="submit" className={btnLime} disabled={pending}>
        {pending ? "Requesting…" : "Withdraw"}
      </button>
    </form>
  );
}
