"use client";

import { useActionState } from "react";
import { completeDelivery, type CompleteDeliveryResult } from "@/lib/actions";
import { btnLime } from "@/components/ui";

/**
 * The payment gate, client side: disabled when payment isn't accounted for —
 * a courtesy for the rider. The REAL enforcement is inside completeDelivery()
 * on the server, which re-derives the gate from store state and rejects
 * regardless of this `gatePassed` prop or the disabled attribute.
 */
export function CompleteButton({ deliveryId, gatePassed }: { deliveryId: string; gatePassed: boolean }) {
  const [state, formAction, pending] = useActionState<CompleteDeliveryResult, FormData>(completeDelivery, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      {state.error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{state.error}</p>
      ) : null}
      <button
        type="submit"
        className={`${btnLime} py-3 disabled:cursor-not-allowed disabled:opacity-40`}
        disabled={!gatePassed || pending}
        title={!gatePassed ? "Payment must be accounted for before you can complete this delivery" : undefined}
      >
        {pending ? "Completing…" : "Mark delivered"}
      </button>
      {!gatePassed ? (
        <p className="text-center text-xs text-slate">Disabled until payment is confirmed or cash is marked collected.</p>
      ) : null}
    </form>
  );
}
