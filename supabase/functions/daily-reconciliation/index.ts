// Compares the real partner-held balance to the ledger's partner_float
// account (06_TRD §9: "double-posting/drift" risk mitigation). Meant to run
// on a schedule (Supabase cron trigger, see supabase/config.toml) — no user
// auth, verify_jwt = false, safe because it only reads and logs.
import { serviceClient, jsonResponse, handled } from "../_shared/supabase-client.ts";
import { envRecord } from "../_shared/env.ts";
import { createPaymentProvider } from "../_shared/payments.js";
import { SupabaseLedgerStore } from "../_shared/ledger-store.ts";

Deno.serve(() =>
  handled(async () => {
    const service = serviceClient();
    const store = new SupabaseLedgerStore(service);
    const provider = createPaymentProvider(envRecord());

    const partnerFloatAccount = await store.ensureAccount({
      type: "partner_float",
      ownerType: "meld",
      ownerId: null,
    });
    // partner_float is debit-normal (packages/ledger's normalBalance()) — flip
    // the raw credit-minus-debit sign to read as "assets the partner should hold".
    const rawBalance = await store.getBalance(partnerFloatAccount);
    const ledgerPartnerFloatKobo = -rawBalance;
    const realBalanceKobo = await provider.getBalance();
    const driftKobo = realBalanceKobo - ledgerPartnerFloatKobo;

    const report = {
      checkedAt: new Date().toISOString(),
      realBalanceKobo,
      ledgerPartnerFloatKobo,
      driftKobo,
      balanced: driftKobo === 0,
    };

    await service.from("audit_log").insert({
      actor_id: null,
      action: "daily_reconciliation",
      entity_type: "ledger_accounts",
      entity_id: partnerFloatAccount,
      detail: report,
    });

    if (!report.balanced) {
      // Phase 6 hardening: page Ops (email/Sentry) — logging only for now.
      console.error("RECONCILIATION DRIFT DETECTED", report);
    }

    return jsonResponse(report);
  }),
);
