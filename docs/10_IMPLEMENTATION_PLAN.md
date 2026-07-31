# MELD — Implementation Plan

**Version:** 1.0
**Depends on:** every other document
**Audience:** you + the AI agents building each part

> Build order matters: money correctness first, then the surfaces that depend on it.
> Each phase lists what to hand an agent and the definition of done. Treat each phase
> as a milestone you can verify before moving on.

---

## 0. Pre-build decisions & blockers

| Item | Action | Owner |
|------|--------|-------|
| **Regulatory/licensing** | Confirm ledger + partner-held-funds posture with a Nigerian fintech lawyer and the payment partner. **Launch blocker.** | You |
| Payment partner | Choose Paystack and/or Flutterwave; get API keys, enable virtual accounts + transfers | You |
| SMS/email | Termii + Resend accounts and keys | You |
| Supabase | Create `staging` + `production` projects | You/agent |
| Brand assets | Final logo SVGs into `packages/ui` | You (provided) |
| Real numbers | Replace placeholder testimonials/stats on marketing before launch | You |

---

## Phase 1 — Foundation (the money core)

**Goal:** a working backend with the ledger, before any app UI.

Hand the agent: `01_SHARED_FOUNDATIONS.md`, `06_TRD_and_Architecture.md`,
`07_DATABASE_SCHEMA.sql`, `07_ER_DIAGRAM.md`.

Tasks:
1. Scaffold monorepo (Turborepo + pnpm) with the folder layout in `01 §2`.
2. Create Supabase project; run `07_DATABASE_SCHEMA.sql` as the first migration.
3. Build `packages/types` (generate from DB), `packages/db` (client).
4. Build `packages/ledger`: `postTransaction`, balance queries, split helper.
   Unit-test: unbalanced transaction rejected; 80/20 split correct; COD postings
   match `01 §4`.
5. Build `packages/fees`: fee resolution (per-merchant override → zone/state →
   fallback). Unit-test each path.
6. Build `packages/payments` interface + one adapter (mock in dev), webhook handler
   with idempotency (`processed_events`).
7. Build `packages/notifications` (SMS/email/in-app) with a mock transport in dev.

**Definition of done:** ledger unit tests green; fee engine tests green; a scripted
end-to-end money scenario (prepaid + COD) posts correct balances in a test DB.

---

## Phase 2 — Operations tool (the control room)

**Goal:** Ops can approve users, receive inventory, assign riders, set fees, see the
ledger — so every other app has something to talk to.

Hand the agent: `05_PRD_Ops.md`, `09_UIUX_SPEC.md §5`, Phase 1 packages.

Tasks: auth + roles; merchant/rider approvals; warehouse + receive inventory; fee
management (global + overrides, versioned); dispatch (assign rider); cash
reconciliation; ledger viewer; withdrawals oversight; audit log; `ops_admin`
gating.

**Definition of done:** an Ops admin can approve a merchant and a rider, receive
stock, set a fee, and view a balanced ledger. RLS verified (non-ops cannot read
others' data).

---

## Phase 3 — Merchant app

Hand the agent: `03_PRD_Merchant.md`, `09_UIUX_SPEC.md §3`, Phase 1 packages.

Tasks: sign-up → pending_approval; dashboard; inventory view; order create (manual +
CSV) with fee shown; order/delivery tracking (Realtime); wallet + withdraw; per-
delivery breakdown report; notifications.

**Definition of done:** an approved merchant creates an order (correct fee), sees it
progress, and can withdraw available balance. Cannot transact while pending.

---

## Phase 4 — Rider app

Hand the agent: `04_PRD_Rider.md`, `09_UIUX_SPEC.md §4`, `08_APP_FLOWS.md §4–7`,
Phase 1 packages.

Tasks: invite/activate; Today list (Realtime assignments); delivery flow; **payment
gate**; prepaid VA generation + instant confirmation; COD cash-collected; cash
remittance via VA; wallet + withdraw; notifications.

**Definition of done:** rider cannot mark delivered without payment/cash; prepaid
confirms instantly via webhook; COD creates a remittance and reconciles; 80% share
lands in wallet; withdrawal works. **This is the highest-risk surface — test the
payment gate server-side, not just UI.**

---

## Phase 5 — Marketing website

Hand the agent: `02_PRD_Marketing.md`, `09_UIUX_SPEC.md §2`, the homepage mockups,
brand guidelines. (Can run in parallel with Phase 2–4; it only needs the app URLs +
two tables.)

Tasks: homepage (all sections), `/riders` form → `rider_applications`, `/demo`,
config-driven hand-off (`config/site.ts`), UTM pass-through, SEO, responsive, a11y.

**Definition of done:** "Start free" hands off to merchant app with attribution;
rider application lands in Ops queue; passes `next build`, Lighthouse a11y ≥ 95.

---

## Phase 6 — Integration, reconciliation, hardening

Tasks: swap payment mock for real partner (staging keys); real webhooks end-to-end;
daily reconciliation job (partner float vs ledger); real SMS/email; RLS policy tests
in CI; error tracking (Sentry); load-check list views; security review (secrets,
webhook signatures, least privilege).

**Definition of done:** a full real-money test on staging (small amounts): prepaid
order, COD order + remittance, merchant settlement, rider withdrawal — all reconcile
to the naira. Reconciliation job green.

---

## Phase 7 — Launch readiness

- Legal/licensing sign-off (blocker from Phase 0).
- Replace all placeholder content (marketing stats/testimonials).
- Seed real fee tables per state.
- Onboard a small pilot cohort (few merchants, few riders) before wide launch.
- Runbooks: failed payout, cash mismatch, partner downtime, ledger discrepancy.

---

## Suggested sequencing

```
Phase 1 (foundation) ──> Phase 2 (ops) ──> Phase 3 (merchant) ──> Phase 4 (rider)
                                   └──────────> Phase 5 (marketing, parallel)
                                                        └──> Phase 6 ──> Phase 7
```

Phases 1→2→3→4 are the critical path (each depends on the prior). Marketing (5) can
be built any time after the app URLs exist. Do not start Phase 6 real-money testing
until 1–4 are done and the ledger is proven.

---

## How to brief each agent (template)

For each surface, give the agent:
1. `00_MASTER_PRD.md` + `01_SHARED_FOUNDATIONS.md` (always — the contract).
2. The specific surface PRD (`02`–`05`).
3. `09_UIUX_SPEC.md` (the relevant section).
4. `08_APP_FLOWS.md` for any surface touching orders/deliveries/money.
5. The Phase 1 packages (already built) — instruct: **use them, don't reinvent money
   logic.**
6. This plan's definition-of-done for that phase as the acceptance test.

Golden rule for every agent: **money logic lives only in `packages/ledger` and
`packages/payments`. Never write ledger rows or compute splits inside an app.**
