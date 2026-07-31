// Idempotent per (purpose, referenceId) — 04_PRD_Rider FR-3: a delivery or
// remittance never gets a second account number, even if the rider retries
// the request. NOTE: not yet exercised against a live payment partner
// (10_IMPLEMENTATION_PLAN Phase 6).
import { serviceClient, jsonResponse, handled } from "../_shared/supabase-client.ts";
import { requireCaller, HttpError } from "../_shared/caller.ts";
import { envRecord } from "../_shared/env.ts";
import { createPaymentProvider } from "../_shared/payments.js";

Deno.serve((req) =>
  handled(async () => {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const { purpose, referenceId } = await req.json();
    if (!["delivery_payment", "cash_remittance"].includes(purpose) || !referenceId) {
      throw new HttpError(400, "purpose and referenceId are required");
    }

    const caller = await requireCaller(req);
    const service = serviceClient();
    const refColumn = purpose === "delivery_payment" ? "delivery_id" : "remittance_id";

    const { data: existing } = await service
      .from("virtual_accounts")
      .select("account_no, bank_name, amount_kobo")
      .eq("purpose", purpose)
      .eq(refColumn, referenceId)
      .eq("is_active", true)
      .maybeSingle();
    if (existing) return jsonResponse(existing);

    let amountKobo: number;
    if (purpose === "delivery_payment") {
      const { data: delivery } = await service
        .from("deliveries")
        .select("rider_id, order_id")
        .eq("id", referenceId)
        .single();
      if (!delivery) throw new HttpError(404, "Delivery not found");
      if (!caller.isOps && caller.riderId !== delivery.rider_id) {
        throw new HttpError(403, "Not authorized for this delivery");
      }
      const { data: order } = await service
        .from("orders")
        .select("order_value_kobo, delivery_fee_kobo, fee_borne_by")
        .eq("id", delivery.order_id)
        .single();
      if (!order) throw new HttpError(404, "Order not found");
      amountKobo =
        order.fee_borne_by === "customer"
          ? order.order_value_kobo + order.delivery_fee_kobo
          : order.order_value_kobo;
    } else {
      const { data: remittance } = await service
        .from("cash_remittances")
        .select("rider_id, amount_owed_kobo")
        .eq("id", referenceId)
        .single();
      if (!remittance) throw new HttpError(404, "Remittance not found");
      if (!caller.isOps && caller.riderId !== remittance.rider_id) {
        throw new HttpError(403, "Not authorized for this remittance");
      }
      amountKobo = remittance.amount_owed_kobo;
    }

    const provider = createPaymentProvider(envRecord());
    const va = await provider.createVirtualAccount({ purpose, referenceId, amountKobo });

    const { error: insertError } = await service.from("virtual_accounts").insert({
      purpose,
      [refColumn]: referenceId,
      provider: va.provider,
      account_no: va.accountNo,
      bank_name: va.bankName,
      amount_kobo: va.amountKobo,
    });
    if (insertError) throw new HttpError(500, insertError.message);

    return jsonResponse({ accountNo: va.accountNo, bankName: va.bankName, amountKobo: va.amountKobo });
  }),
);
