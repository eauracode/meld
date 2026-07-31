"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost, customerOwesKobo, meldApi, nairaToKobo } from "./api";

function refresh(): void {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Delivery lifecycle (assigned → accepted → en_route → arrived → delivered/failed)
// ---------------------------------------------------------------------------

export async function acceptDelivery(formData: FormData): Promise<void> {
  await apiPost(`/deliveries/${String(formData.get("deliveryId"))}/accept`);
  refresh();
}

export async function startEnRoute(formData: FormData): Promise<void> {
  await apiPost(`/deliveries/${String(formData.get("deliveryId"))}/en-route`);
  refresh();
}

export async function markArrived(formData: FormData): Promise<void> {
  await apiPost(`/deliveries/${String(formData.get("deliveryId"))}/arrived`);
  refresh();
}

export async function failDelivery(formData: FormData): Promise<void> {
  const deliveryId = String(formData.get("deliveryId"));
  const reason = String(formData.get("reason") ?? "").trim() || "Could not complete delivery";
  await apiPost(`/deliveries/${deliveryId}/fail`, { reason });
  refresh();
}

// ---------------------------------------------------------------------------
// Prepaid: virtual account + (dev) simulated webhook confirmation
// ---------------------------------------------------------------------------

export async function generateVirtualAccount(formData: FormData): Promise<void> {
  const deliveryId = String(formData.get("deliveryId"));
  await apiPost("/virtual-accounts", { purpose: "delivery_payment", referenceId: deliveryId });
  refresh();
}

/**
 * Dev-only: stands in for the customer transferring funds + the partner's
 * webhook firing (no real Paystack/Flutterwave keys configured yet).
 * The amount is re-derived server-side from the order, never trusted from
 * the client. Production wires the real webhook to the same
 * WebhooksService.handlePaymentWebhook — see apps/api/src/webhooks.
 */
export async function simulateCustomerPayment(formData: FormData): Promise<void> {
  const deliveryId = String(formData.get("deliveryId"));
  const orderId = String(formData.get("orderId"));
  const order = await meldApi.order(orderId);
  await apiPost("/webhooks/simulate", {
    purpose: "delivery_payment",
    referenceId: deliveryId,
    amountKobo: customerOwesKobo(order),
  });
  refresh();
}

// ---------------------------------------------------------------------------
// COD: mark cash collected
// ---------------------------------------------------------------------------

export interface CashCollectedResult {
  error: string | null;
}

export async function markCashCollected(_prev: CashCollectedResult, formData: FormData): Promise<CashCollectedResult> {
  const deliveryId = String(formData.get("deliveryId"));
  let amountKobo: number;
  try {
    amountKobo = nairaToKobo(String(formData.get("amountNaira") ?? ""), "Cash collected");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (amountKobo === 0) return { error: "Enter the amount collected from the customer." };

  try {
    await apiPost(`/deliveries/${deliveryId}/cash-collected`, { amountKobo });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not record cash collected." };
  }
  refresh();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Complete delivery — THE HARD PAYMENT GATE, enforced server-side in apps/api
// ---------------------------------------------------------------------------

export interface CompleteDeliveryResult {
  error: string | null;
}

export async function completeDelivery(_prev: CompleteDeliveryResult, formData: FormData): Promise<CompleteDeliveryResult> {
  const deliveryId = String(formData.get("deliveryId"));
  try {
    await apiPost(`/deliveries/${deliveryId}/complete`);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not complete this delivery." };
  }
  refresh();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Cash remittance — generating a VA is self-service; confirming receipt is
// ops-only (see apps/ops's cash reconciliation page), matching real-world
// practice: a rider self-attesting "I paid" isn't independent verification.
// ---------------------------------------------------------------------------

export async function generateRemittanceAccount(formData: FormData): Promise<void> {
  const remittanceId = String(formData.get("remittanceId"));
  await apiPost("/virtual-accounts", { purpose: "cash_remittance", referenceId: remittanceId });
  refresh();
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export interface WithdrawResult {
  error: string | null;
  ok: boolean;
}

export async function requestWithdrawal(_prev: WithdrawResult, formData: FormData): Promise<WithdrawResult> {
  let amountKobo: number;
  try {
    amountKobo = nairaToKobo(String(formData.get("amountNaira") ?? ""), "Amount");
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }
  if (amountKobo === 0) return { error: "Amount must be greater than zero.", ok: false };

  try {
    await apiPost("/withdrawals", { amountKobo });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not request the withdrawal.", ok: false };
  }
  refresh();
  return { error: null, ok: true };
}
