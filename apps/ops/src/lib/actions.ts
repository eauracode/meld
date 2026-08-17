"use server";

import { revalidatePath } from "next/cache";
import type { Kobo } from "@meld/types";
import { ApiError, apiPost, nairaToKobo } from "./api";

function refresh(): void {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export async function approveMerchant(formData: FormData): Promise<void> {
  const id = String(formData.get("merchantId"));
  const feeBorneBy = formData.get("feeBorneBy") === "customer" ? "customer" : "merchant";
  const overrideRaw = String(formData.get("overrideFeeNaira") ?? "").trim();
  await apiPost(`/merchants/${id}/approve`, {
    feeBorneBy,
    overrideFlatFeeKobo: overrideRaw ? nairaToKobo(overrideRaw, "override fee") : undefined,
  });
  refresh();
}

export async function rejectMerchant(formData: FormData): Promise<void> {
  const id = String(formData.get("merchantId"));
  await apiPost(`/merchants/${id}/suspend`);
  refresh();
}

export interface ApproveRiderResult {
  error: string | null;
  success: { email: string; initialPassword: string } | null;
}

export async function approveRiderApplication(
  _prev: ApproveRiderResult,
  formData: FormData,
): Promise<ApproveRiderResult> {
  const id = String(formData.get("applicationId"));
  try {
    const result = await apiPost<{ rider: unknown; email: string; initialPassword: string }>(
      `/riders/applications/${id}/approve`,
      {}, // no override — backend defaults to the application's own stored email
    );
    refresh();
    return { error: null, success: { email: result.email, initialPassword: result.initialPassword } };
  } catch (e) {
    return {
      error: e instanceof ApiError ? e.message : "Could not approve this application.",
      success: null,
    };
  }
}

export async function rejectRiderApplication(formData: FormData): Promise<void> {
  const id = String(formData.get("applicationId"));
  const reason = String(formData.get("reason") ?? "").trim() || "Not specified";
  await apiPost(`/riders/applications/${id}/reject`, { reason });
  refresh();
}

export async function setMerchantState(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const to = String(formData.get("to"));
  await apiPost(`/merchants/${id}/${to === "approved" ? "reactivate" : "suspend"}`);
  refresh();
}

export async function setRiderState(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const to = String(formData.get("to"));
  await apiPost(`/riders/${id}/${to === "active" ? "reactivate" : "suspend"}`);
  refresh();
}

// ---------------------------------------------------------------------------
// Warehouse & inventory
// ---------------------------------------------------------------------------

export async function addWarehouse(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  if (!name || !state) return;
  await apiPost("/warehouses", { name, state });
  refresh();
}

export async function receiveInventory(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId"));
  const warehouseId = String(formData.get("warehouseId"));
  const quantity = Number(formData.get("quantity"));
  if (!Number.isInteger(quantity) || quantity <= 0) return;
  await apiPost("/inventory/receive", { productId, warehouseId, quantity });
  refresh();
}

export async function adjustStock(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId"));
  const warehouseId = String(formData.get("warehouseId"));
  const change = Number(formData.get("change"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!Number.isInteger(change) || change === 0 || !reason) return;
  await apiPost("/inventory/adjust", { productId, warehouseId, change, reason });
  refresh();
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export async function assignRider(formData: FormData): Promise<void> {
  const orderId = String(formData.get("orderId"));
  const riderId = String(formData.get("riderId"));
  const deliveryFeeKobo = nairaToKobo(String(formData.get("deliveryFeeNaira") ?? ""), "delivery fee");
  const riderPayoutKobo = nairaToKobo(String(formData.get("riderPayoutNaira") ?? ""), "rider payout");
  if (deliveryFeeKobo <= 0) throw new Error("Delivery fee must be greater than zero");
  if (riderPayoutKobo > deliveryFeeKobo) throw new Error("Rider payout cannot exceed the delivery fee");
  await apiPost("/deliveries/assign", { orderId, riderId, deliveryFeeKobo, riderPayoutKobo });
  refresh();
}

// ---------------------------------------------------------------------------
// Fees (ops_admin only — enforced server-side by the API's role guard)
// ---------------------------------------------------------------------------

export async function setGlobalFeeRule(formData: FormData): Promise<void> {
  const intrastateFeeKobo = nairaToKobo(String(formData.get("intrastateNaira") ?? "0"), "intrastate fee");
  const fallbackFeeKobo = nairaToKobo(String(formData.get("fallbackNaira") ?? "0"), "fallback fee");
  const byState: Record<string, Kobo> = {};
  for (const line of String(formData.get("byStateLines") ?? "").split("\n")) {
    const [state, naira] = line.split("=").map((s) => s.trim());
    if (state && naira) byState[state] = nairaToKobo(naira, `fee for ${state}`);
  }
  await apiPost("/fee-rules/global", { intrastateFeeKobo, byState, fallbackFeeKobo });
  refresh();
}

export async function setMerchantOverride(formData: FormData): Promise<void> {
  const merchantId = String(formData.get("merchantId"));
  const flatFeeKobo = nairaToKobo(String(formData.get("flatNaira") ?? ""), "override fee");
  await apiPost(`/fee-rules/merchant/${merchantId}`, { flatFeeKobo });
  refresh();
}

// ---------------------------------------------------------------------------
// Cash reconciliation
// ---------------------------------------------------------------------------

export async function confirmRemittance(formData: FormData): Promise<void> {
  const id = String(formData.get("remittanceId"));
  await apiPost(`/cash-remittances/${id}/confirm`);
  refresh();
}

export async function flagRemittance(formData: FormData): Promise<void> {
  const id = String(formData.get("remittanceId"));
  await apiPost(`/cash-remittances/${id}/flag`);
  refresh();
}

// ---------------------------------------------------------------------------
// Withdrawals (payout execution is ops_admin)
// ---------------------------------------------------------------------------

export async function processWithdrawal(formData: FormData): Promise<void> {
  const id = String(formData.get("withdrawalId"));
  await apiPost(`/withdrawals/${id}/process`);
  refresh();
}

export async function failWithdrawal(formData: FormData): Promise<void> {
  const id = String(formData.get("withdrawalId"));
  const reason = String(formData.get("reason") ?? "").trim() || "Partner error";
  await apiPost(`/withdrawals/${id}/fail`, { reason });
  refresh();
}

export async function retryWithdrawal(formData: FormData): Promise<void> {
  const id = String(formData.get("withdrawalId"));
  await apiPost(`/withdrawals/${id}/retry`);
  refresh();
}

// ---------------------------------------------------------------------------
// Manual ledger adjustment (ops_admin only, reason required, balanced)
// ---------------------------------------------------------------------------

export async function manualAdjustment(formData: FormData): Promise<void> {
  const debitAccountId = String(formData.get("debitAccountId"));
  const creditAccountId = String(formData.get("creditAccountId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("A reason is required for manual adjustments");
  if (debitAccountId === creditAccountId) throw new Error("Debit and credit accounts must differ");
  const amountKobo = nairaToKobo(String(formData.get("amountNaira") ?? ""), "adjustment amount");
  await apiPost("/ledger/adjustments", { debitAccountId, creditAccountId, amountKobo, reason });
  refresh();
}
