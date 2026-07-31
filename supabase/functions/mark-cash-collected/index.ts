// Rider marks COD cash collected. Posts the 80/20 split immediately (money
// moves at collection time, not at delivery completion — 01_SHARED_FOUNDATIONS
// §4 Scenario B) and flips deliveries.cash_collected, which unblocks
// complete_delivery()'s payment gate.
import { serviceClient, jsonResponse, handled } from "../_shared/supabase-client.ts";
import { requireCaller, HttpError } from "../_shared/caller.ts";
import { SupabaseLedgerStore } from "../_shared/ledger-store.ts";
import { postTransaction, buildCodCashCollectedPosting } from "../_shared/ledger.js";

Deno.serve((req) =>
  handled(async () => {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const { deliveryId, amountKobo } = await req.json();
    if (!deliveryId || !Number.isInteger(amountKobo) || amountKobo <= 0) {
      throw new HttpError(400, "deliveryId and a positive integer amountKobo are required");
    }

    const caller = await requireCaller(req);
    const service = serviceClient();

    const { data: delivery } = await service
      .from("deliveries")
      .select("id, rider_id, order_id, cash_collected")
      .eq("id", deliveryId)
      .single();
    if (!delivery) throw new HttpError(404, "Delivery not found");
    if (!caller.isOps && caller.riderId !== delivery.rider_id) {
      throw new HttpError(403, "Not authorized for this delivery");
    }
    if (delivery.cash_collected) {
      return jsonResponse({ ok: true, alreadyCollected: true });
    }

    const { data: order } = await service
      .from("orders")
      .select("merchant_id, delivery_fee_kobo, payment_type")
      .eq("id", delivery.order_id)
      .single();
    if (!order) throw new HttpError(404, "Order not found");
    if (order.payment_type !== "cod") throw new HttpError(400, "Order is not cash-on-delivery");

    const store = new SupabaseLedgerStore(service);
    const cashInTransit = await store.ensureAccount({
      type: "cash_in_transit",
      ownerType: "rider",
      ownerId: delivery.rider_id,
    });
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
    const meldRevenue = await store.ensureAccount({ type: "meld_revenue", ownerType: "meld", ownerId: null });

    const { tx, merchantProceedsKobo } = buildCodCashCollectedPosting({
      accounts: { cashInTransit, merchantPayable, riderWallet, meldRevenue },
      deliveryId: delivery.id,
      cashAmountKobo: amountKobo,
      deliveryFeeKobo: order.delivery_fee_kobo,
    });
    await postTransaction(store, tx);

    await service
      .from("deliveries")
      .update({ cash_collected: true, cash_amount_kobo: amountKobo, updated_at: new Date().toISOString() })
      .eq("id", delivery.id);

    // Creates the remittance obligation the rider clears via generate-virtual-account.
    await service.from("cash_remittances").insert({
      rider_id: delivery.rider_id,
      delivery_id: delivery.id,
      amount_owed_kobo: amountKobo,
      status: "pending",
    });

    return jsonResponse({ ok: true, merchantProceedsKobo });
  }),
);
