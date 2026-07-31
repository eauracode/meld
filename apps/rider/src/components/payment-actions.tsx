"use client";

import { useActionState, useTransition } from "react";
import { generateVirtualAccount, simulateCustomerPayment } from "@/lib/actions";
import { btnLime, btnOutline } from "@/components/ui";

/**
 * Prepaid collection: generate the one-time virtual account, then wait for
 * the partner webhook. "Simulate customer payment" stands in for that
 * webhook in this demo — production fires it for real (06_TRD §4/§6).
 */
export function PaymentActions({
  deliveryId,
  orderId,
  hasVirtualAccount,
  virtualAccountNo,
  virtualAccountBank,
  paid,
}: {
  deliveryId: string;
  orderId: string;
  hasVirtualAccount: boolean;
  virtualAccountNo: string | null;
  virtualAccountBank: string | null;
  paid: boolean;
}) {
  const [genPending, startGen] = useTransition();
  const [payPending, startPay] = useTransition();

  if (paid) {
    return <p className="text-sm font-semibold text-green-800">✓ Payment confirmed — you can complete this delivery.</p>;
  }

  if (!hasVirtualAccount) {
    return (
      <form
        action={(fd) => startGen(() => generateVirtualAccount(fd))}
      >
        <input type="hidden" name="deliveryId" value={deliveryId} />
        <button type="submit" className={btnLime} disabled={genPending}>
          {genPending ? "Generating…" : "Generate account number"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-ink p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Customer transfers to</p>
        <p className="mt-1 font-heading text-lg font-bold tabular-nums text-lime">{virtualAccountNo}</p>
        <p className="text-sm text-muted-dark">{virtualAccountBank}</p>
        <p className="mt-2 text-xs text-muted-dark">Waiting for payment confirmation — updates instantly, no need to call the office.</p>
      </div>
      <form action={(fd) => startPay(() => simulateCustomerPayment(fd))}>
        <input type="hidden" name="deliveryId" value={deliveryId} />
        <input type="hidden" name="orderId" value={orderId} />
        <button type="submit" className={btnOutline} disabled={payPending}>
          {payPending ? "Confirming…" : "Dev: simulate customer payment"}
        </button>
      </form>
    </div>
  );
}

export function CashCollectForm({
  deliveryId,
  action,
  collected,
  amountKobo,
}: {
  deliveryId: string;
  action: (state: { error: string | null }, formData: FormData) => Promise<{ error: string | null }>;
  collected: boolean;
  amountKobo: number | null;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  if (collected) {
    return (
      <p className="text-sm font-semibold text-green-800">
        ✓ Cash collected{amountKobo != null ? ` (₦${(amountKobo / 100).toLocaleString("en-NG")})` : ""} — you can complete this
        delivery. Remember to remit it under Cash.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
        Amount collected (₦)
        <input name="amountNaira" inputMode="decimal" className="rounded-lg border border-slate/40 bg-white px-3 py-1.5 text-sm" required />
      </label>
      {state.error ? <p className="text-sm font-semibold text-red-700">{state.error}</p> : null}
      <button type="submit" className={btnLime} disabled={pending}>
        {pending ? "Recording…" : "Mark cash collected"}
      </button>
    </form>
  );
}
