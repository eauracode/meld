"use server";

import { revalidatePath } from "next/cache";
import type { Kobo } from "@meld/types";
import { apiPost, nairaToKobo } from "./api";

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

export async function approveRiderApplication(formData: FormData): Promise<void> {
  const id = String(formData.get("applicationId"));
  const email = String(formData.get("email") ?? "").trim();
  if (!email) throw new Error("An email is required to create the rider's login");
  await apiPost(`/riders/applications/${id}/approve`, { email });
  refresh();
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
  await apiPost("/deliveries/assign", { orderId, riderId });
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
