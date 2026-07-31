// Receives Paystack/Flutterwave webhooks for both prepaid delivery payments
// and COD cash remittances. Signature-verified, idempotent (processed_events
// unique constraint), and posts to the ledger via the real @meld/ledger
// builders (bundled — see scripts/bundle-edge-functions.mjs).
//
// verify_jwt = false for this function (see supabase/config.toml) — the
// caller is the payment partner, not a MELD user; the signature check IS
// the auth. Register this URL as the webhook endpoint in each partner's
// dashboard once real keys exist.
//
// NOTE: normalizeEvent()'s field paths match each partner's documented
// payload shape as of this writing — verify against a real webhook delivery
// (partner dashboards can resend a test event) before relying on this in
// production. Not yet exercised live (10_IMPLEMENTATION_PLAN Phase 6).
import { serviceClient, jsonResponse } from "../_shared/supabase-client.ts";
import { envRecord } from "../_shared/env.ts";
import { SupabaseLedgerStore } from "../_shared/ledger-store.ts";
// deno-lint-ignore no-explicit-any
import { createPaymentProvider, handlePaymentEvent, type PaymentEvent } from "../_shared/payments.js";
// deno-lint-ignore no-explicit-any
import { postTransaction, buildPrepaidConfirmedPosting } from "../_shared/ledger.js";

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const rawBody = await req.text();
  const env = envRecord();
  const provider = createPaymentProvider(env);

  const signature = req.headers.get("x-paystack-signature") ?? req.headers.get("verif-hash") ?? "";
  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const event = normalizeEvent(provider.name, payload);
  if (!event) return jsonResponse({ ok: true, ignored: true });

  const client = serviceClient();
  const store = new SupabaseLedgerStore(client);

  const processed = {
    async recordIfNew(providerName: string, eventId: string): Promise<boolean> {
      const { error } = await client.from("processed_events").insert({ provider: providerName, event_id: eventId });
      if (error) {
        if (error.code === "23505") return false; // unique_violation → already processed
        throw new Error(`processed_events insert failed: ${error.message}`);
      }
      return true;
    },
  };

  try {
    const outcome = await handlePaymentEvent(event, {
      processed,
      onPayment: async (e) => {
        if (e.purpose === "delivery_payment") {
          await confirmDeliveryPayment(client, store, e);
        } else {
          await confirmRemittancePayment(client, store, e);
        }
      },
    });
    return jsonResponse({ ok: true, outcome });
  } catch (err) {
    console.error("payment-webhook processing failed", err);
    // 500 tells the partner to retry — processed_events already guards
    // against double-posting if the retry lands after partial work.
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

async function confirmDeliveryPayment(
  // deno-lint-ignore no-explicit-any
  client: any,
  store: SupabaseLedgerStore,
  event: PaymentEvent,
): Promise<void> {
  const { data: delivery, error: deliveryError } = await client
    .from("deliveries")
    .select("id, order_id, rider_id, payment_status")
    .eq("id", event.referenceId)
    .single();
  if (deliveryError || !delivery) throw new Error(`Delivery ${event.referenceId} not found`);
  if (delivery.payment_status === "paid") return; // already confirmed, nothing to do

  const { data: order, error: orderError } = await client
    .from("orders")
    .select("merchant_id, order_value_kobo, delivery_fee_kobo, fee_borne_by")
    .eq("id", delivery.order_id)
    .single();
  if (orderError || !order) throw new Error(`Order for delivery ${delivery.id} not found`);

  const partnerFloat = await store.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
  const meldRevenue = await store.ensureAccount({ type: "meld_revenue", ownerType: "meld", ownerId: null });
  const merchantPayable = await store.ensureAccount({
    type: "merchant_payable",
    ownerType: "merchant",
    ownerId: order.merchant_id,
  });
  const riderWallet = await store.ensureAccount({
    type: "rider_wallet",
    ownerType: "rider",
    ownerId: delivery.rider_id,
  });

  const { tx } = buildPrepaidConfirmedPosting({
    accounts: { partnerFloat, merchantPayable, riderWallet, meldRevenue },
    deliveryId: delivery.id,
    orderValueKobo: order.order_value_kobo,
    deliveryFeeKobo: order.delivery_fee_kobo,
    feeBorneBy: order.fee_borne_by,
  });
  await postTransaction(store, tx);

  await client.from("payments").insert({
    delivery_id: delivery.id,
    provider: event.provider,
    provider_ref: event.eventId,
    amount_kobo: event.amountKobo,
    method: "transfer",
    status: "paid",
    raw: event.raw ?? null,
  });
  await client
    .from("deliveries")
    .update({ payment_status: "paid", updated_at: new Date().toISOString() })
    .eq("id", delivery.id);
}

async function confirmRemittancePayment(
  // deno-lint-ignore no-explicit-any
  client: any,
  store: SupabaseLedgerStore,
  event: PaymentEvent,
): Promise<void> {
  const { data: remittance, error } = await client
    .from("cash_remittances")
    .select("id, rider_id, amount_owed_kobo, status")
    .eq("id", event.referenceId)
    .single();
  if (error || !remittance) throw new Error(`Remittance ${event.referenceId} not found`);
  if (remittance.status !== "pending") return; // already remitted/reconciled

  const partnerFloat = await store.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
  const cashInTransit = await store.ensureAccount({
    type: "cash_in_transit",
    ownerType: "rider",
    ownerId: remittance.rider_id,
  });

  const { buildCashRemittedPosting } = await import("../_shared/ledger.js");
  await postTransaction(
    store,
    buildCashRemittedPosting({
      accounts: { partnerFloat, cashInTransit },
      remittanceId: remittance.id,
      amountKobo: event.amountKobo,
    }),
  );

  await client
    .from("cash_remittances")
    .update({ amount_remitted_kobo: event.amountKobo, status: "remitted" })
    .eq("id", remittance.id);
}

function normalizeEvent(providerName: string, payload: Record<string, unknown>): PaymentEvent | null {
  const referencePattern = /^(delivery_payment|cash_remittance)[-_](.+)$/;

  if (providerName === "paystack") {
    if (payload.event !== "charge.success") return null;
    // deno-lint-ignore no-explicit-any
    const d = payload.data as any;
    const email: string = d?.customer?.email ?? "";
    const match = email.match(referencePattern);
    if (!match) return null; // not one of our collection accounts
    return {
      provider: "paystack",
      eventId: String(d.id ?? d.reference),
      type: "payment.received",
      accountNo: d?.authorization?.receiver_bank_account_number ?? "",
      referenceId: match[2],
      purpose: match[1] as "delivery_payment" | "cash_remittance",
      amountKobo: Number(d.amount), // Paystack quotes amounts in kobo already
      raw: payload,
    };
  }

  if (providerName === "flutterwave") {
    // deno-lint-ignore no-explicit-any
    const d = payload.data as any;
    if (payload.event !== "charge.completed" || d?.status !== "successful") return null;
    const txRef: string = d?.tx_ref ?? "";
    const match = txRef.match(referencePattern);
    if (!match) return null;
    return {
      provider: "flutterwave",
      eventId: String(d.id),
      type: "payment.received",
      accountNo: d?.account_number ?? "",
      referenceId: match[2],
      purpose: match[1] as "delivery_payment" | "cash_remittance",
      amountKobo: Math.round(Number(d.amount ?? 0) * 100), // Flutterwave quotes naira
      raw: payload,
    };
  }

  return null;
}
