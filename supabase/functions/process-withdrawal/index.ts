// ops_admin executes a payout: validates the balance, calls the partner
// transfer API, then posts the ledger movement only on success. Failures
// leave the ledger untouched and mark the withdrawal 'failed' for retry
// (05_PRD_Ops §2.6). NOTE: not yet exercised against a live partner
// (10_IMPLEMENTATION_PLAN Phase 6).
import { serviceClient, jsonResponse, handled } from "../_shared/supabase-client.ts";
import { requireCaller, HttpError } from "../_shared/caller.ts";
import { envRecord } from "../_shared/env.ts";
import { createPaymentProvider } from "../_shared/payments.js";
import { SupabaseLedgerStore } from "../_shared/ledger-store.ts";
import { postTransaction, buildWithdrawalPaidPosting } from "../_shared/ledger.js";

Deno.serve((req) =>
  handled(async () => {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const { withdrawalId } = await req.json();
    if (!withdrawalId) throw new HttpError(400, "withdrawalId is required");

    const caller = await requireCaller(req);
    const service = serviceClient();

    const { data: profile } = await service.from("profiles").select("role").eq("id", caller.userId).single();
    if (profile?.role !== "ops_admin") throw new HttpError(403, "Only ops_admin can process withdrawals");

    const { data: withdrawal } = await service.from("withdrawals").select("*").eq("id", withdrawalId).single();
    if (!withdrawal) throw new HttpError(404, "Withdrawal not found");
    if (withdrawal.status !== "requested") {
      throw new HttpError(400, `Withdrawal is ${withdrawal.status}, not requested`);
    }

    const ownerAccountType = withdrawal.owner_type === "merchant" ? "merchant_payable" : "rider_wallet";
    const ownerTable = withdrawal.owner_type === "merchant" ? "merchants" : "riders";
    const { data: owner } = await service
      .from(ownerTable)
      .select("bank_name, bank_code, bank_account_no, bank_account_name")
      .eq("id", withdrawal.owner_id)
      .single();
    if (!owner) throw new HttpError(404, `${withdrawal.owner_type} not found`);
    if (!owner.bank_code) {
      throw new HttpError(400, `${withdrawal.owner_type} has no bank_code on file — cannot initiate transfer`);
    }

    const store = new SupabaseLedgerStore(service);
    const ownerAccount = await store.ensureAccount({
      type: ownerAccountType,
      ownerType: withdrawal.owner_type,
      ownerId: withdrawal.owner_id,
    });
    const balance = await store.getBalance(ownerAccount);
    if (withdrawal.amount_kobo > balance) throw new HttpError(400, "Withdrawal exceeds available balance");

    const provider = createPaymentProvider(envRecord());
    const result = await provider.initiateTransfer({
      amountKobo: withdrawal.amount_kobo,
      bankName: owner.bank_name,
      bankCode: owner.bank_code,
      bankAccountNo: owner.bank_account_no,
      accountName: owner.bank_account_name,
      reference: withdrawal.id,
    });

    if (result.status === "failed") {
      await service
        .from("withdrawals")
        .update({ status: "failed", failure_reason: result.failureReason ?? "Transfer failed" })
        .eq("id", withdrawalId);
      return jsonResponse({ ok: false, status: "failed", reason: result.failureReason });
    }

    const partnerFloat = await store.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
    await postTransaction(
      store,
      buildWithdrawalPaidPosting({
        accounts: { owner: ownerAccount, partnerFloat },
        withdrawalId,
        amountKobo: withdrawal.amount_kobo,
      }),
    );

    await service
      .from("withdrawals")
      .update({
        status: result.status === "paid" ? "paid" : "processing",
        provider: provider.name,
        provider_ref: result.providerRef,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    await service.from("audit_log").insert({
      actor_id: caller.userId,
      action: "process_withdrawal",
      entity_type: "withdrawal",
      entity_id: withdrawalId,
      detail: { amount_kobo: withdrawal.amount_kobo, provider_ref: result.providerRef },
    });

    return jsonResponse({ ok: true, status: result.status });
  }),
);
