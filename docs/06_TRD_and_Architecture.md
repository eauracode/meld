# MELD — Technical Requirements Document (TRD) & Architecture

**Version:** 1.0
**Depends on:** all PRDs, `01_SHARED_FOUNDATIONS.md`
**Schema:** `07_DATABASE_SCHEMA.sql`

---

## 1. System overview

```
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │  marketing   │  │   merchant   │  │    rider     │  │     ops      │
        │  (Next.js)   │  │  (Next.js)   │  │  (Next.js)   │  │  (Next.js)   │
        └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
               │                 │                 │                 │
               │     shared packages: db, ledger, fees, auth,        │
               │     ui, notifications, payments, types              │
               └─────────────────┴────────┬────────┴─────────────────┘
                                          │
                          ┌───────────────▼────────────────┐
                          │           Supabase             │
                          │  Postgres (RLS)  •  Auth        │
                          │  Storage  •  Realtime           │
                          │  Edge Functions (webhooks)      │
                          └───────┬────────────────┬────────┘
                                  │                │
                    ┌─────────────▼──┐   ┌─────────▼───────────┐
                    │ Paystack /     │   │ Termii (SMS)        │
                    │ Flutterwave    │   │ Resend (email)      │
                    │ (VAs, payouts) │   │                     │
                    └────────────────┘   └─────────────────────┘
```

- Four Next.js apps, one Supabase backend, shared packages for all cross-cutting
  logic. Frontends never contain money logic — they call `packages/ledger`,
  `packages/fees`, `packages/payments`.
- **RLS is the security boundary.** Frontends guard routes for UX; the database
  enforces access.

---

## 2. Data access & security

- **Row-Level Security** on every business table. Policy summary:
  - `merchant`: only rows where `merchant_id = auth.uid()`'s merchant.
  - `rider`: only deliveries where `rider_id = auth.uid()`'s rider, and own wallet
    entries.
  - `ops_agent`/`ops_admin`: broad read; writes gated by role.
  - Public (marketing): insert-only into `rider_applications`, `demo_requests`.
- **Ledger writes** happen only via a Postgres function (`post_ledger_transaction`)
  or an Edge Function using the service role — never directly from a client. The
  function enforces debits = credits atomically in a transaction.
- **Secrets** (partner keys, webhook secrets) live in environment config / Supabase
  vault, never in the repo or client bundles.
- **Webhooks** run as Supabase Edge Functions with signature verification and
  idempotency keys.

---

## 3. Key backend functions (Postgres / Edge)

| Function | Where | Responsibility |
|----------|-------|----------------|
| `post_ledger_transaction(entries[])` | Postgres (SECURITY DEFINER) | Atomic, balanced ledger posting; rejects unbalanced |
| `resolve_delivery_fee(order)` | `packages/fees` + SQL helper | Fee at order creation |
| `complete_delivery(delivery_id)` | Postgres/Edge | Validates payment gate, posts 80/20 split, sets status |
| `generate_virtual_account(delivery_id \| remittance_id)` | Edge → partner | One-time/dedicated VA |
| `payment_webhook` | Edge | Verify signature, idempotent, post to ledger, flip status |
| `request_withdrawal(account, amount)` | Edge → partner | Validate ≤ balance, execute payout, post ledger |
| `receive_inventory(...)` | Postgres | Increment stock, audit |
| `assign_rider(delivery_id, rider_id)` | Postgres/Edge | Validate active rider, set status, notify |

**Idempotency:** payment/remittance webhooks carry a partner event id stored in a
`processed_events` table; re-delivered events are ignored.

---

## 4. Payment partner integration

- **Interface** in `packages/payments` with two adapters (Paystack, Flutterwave) so
  either can be primary. Methods: `createVirtualAccount`, `verifyWebhook`,
  `initiateTransfer` (payout), `getBalance`.
- **Virtual accounts:** used for (a) prepaid delivery collection and (b) COD cash
  remittance. Each tied to a delivery or remittance id.
- **Payouts:** merchant settlements and rider withdrawals via partner transfer API.
- **Reconciliation job** (scheduled Edge Function, daily): compare partner balance to
  ledger `partner float`; alert Ops on drift.

---

## 5. Realtime

Supabase Realtime channels push:
- Delivery status + payment status → merchant and rider apps.
- New assignments → rider app.
- Ledger/wallet changes → merchant and rider balances.
- Ops dashboards (in-progress, stuck, unremitted cash).

---

## 6. Notifications pipeline

`packages/notifications` exposes `notify(event, recipients, channels)`. An Edge
Function (or DB trigger + queue) fans out to Termii (SMS), Resend (email), and the
`notifications` table (in-app). Templates per event. Channel-agnostic so WhatsApp
can be added later without touching callers.

---

## 7. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Correctness | Ledger always balances; money in integer kobo; no floats |
| Security | RLS everywhere; verified webhooks; secrets in vault; least privilege |
| Availability | Target 99.5% v1; graceful degradation if partner/SMS down (queue + retry) |
| Performance | Realtime < 2s for payment confirmation; list views paginated |
| Auditability | `audit_log` for sensitive actions; ledger immutable (append-only; corrections are new entries) |
| Idempotency | All webhooks and payouts idempotent |
| Accessibility | WCAG AA across all surfaces |
| Observability | Structured logs, error tracking (e.g. Sentry), payout/reconciliation alerts |
| Data protection | NDPR-aware handling of customer PII; minimal retention; encrypted at rest (Supabase default) |

---

## 8. Environments & deployment

- Three Supabase projects: `local`/`staging`/`production`.
- Frontends on Vercel, one project per app, environment-scoped config.
- Migrations versioned in `supabase/migrations` (source of truth = `07_DATABASE_SCHEMA.sql`).
- CI: typecheck, lint, run migration checks, build all apps.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Regulatory (holding balances) | Ledger + partner-held funds; confirm licensing before launch (blocker) |
| COD cash leakage | Hard completion gate; remittance obligations; daily reconciliation; Ops flags |
| Double-posting payments | Idempotent webhooks + `processed_events` |
| Partner downtime | Queue payouts, retry; surface status to Ops |
| RLS misconfiguration | Policy tests in CI; deny-by-default |
| AI-agent inconsistency across apps | Shared packages + this doc set as the contract |
