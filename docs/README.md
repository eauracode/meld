# MELD — Product & Engineering Documentation

This is the complete guide set for building MELD: an e-commerce operations platform
for Nigeria, delivered as four connected web apps on one shared backend.

**Read in this order.** `00` and `01` are the contract every other doc depends on.

| # | File | What it is |
|---|------|-----------|
| 00 | `00_MASTER_PRD.md` | Vision, the four surfaces, business & money model, scope (v1 + long-term) |
| 01 | `01_SHARED_FOUNDATIONS.md` | Tech stack, monorepo, auth, **the double-entry ledger**, fee engine, payments, notifications |
| 02 | `02_PRD_Marketing.md` | Marketing website spec |
| 03 | `03_PRD_Merchant.md` | Merchant app spec |
| 04 | `04_PRD_Rider.md` | Rider app spec (payment-critical) |
| 05 | `05_PRD_Ops.md` | Operations tool spec |
| 06 | `06_TRD_and_Architecture.md` | System design, APIs, security, integrations, risks |
| 07 | `07_DATABASE_SCHEMA.sql` | **Executable** Postgres schema (validated) |
| 07 | `07_ER_DIAGRAM.md` | Entity-relationship diagram (Mermaid) |
| 08 | `08_APP_FLOWS.md` | End-to-end flows + state machines (Mermaid) |
| 09 | `09_UIUX_SPEC.md` | Design system + screen inventory per surface |
| 10 | `10_IMPLEMENTATION_PLAN.md` | Build order, milestones, agent hand-off |

## The essentials, in one breath

- **What:** MELD runs everything after an e-commerce sale — warehousing, fulfilment,
  nationwide delivery, payment collection (transfer + COD), and money settlement.
- **Money:** MELD charges a delivery fee, split **80% rider / 20% MELD**, tracked in a
  **double-entry ledger** while real funds sit with a licensed partner (Paystack/
  Flutterwave). Merchant and rider balances are ledger-derived; withdrawals are real
  partner payouts.
- **The hard rule:** a rider cannot complete a delivery unless payment is
  accounted for (confirmed transfer, or cash marked collected).
- **Stack:** TypeScript monorepo, Next.js × 4 frontends, one Supabase backend,
  shared packages for the money core.
- **Scope:** lean v1 defined; long-term vision architected-for but not built.

## For AI agents

Every agent starts with `00` + `01`, then its surface PRD, then `08`/`09` as needed.
**Money logic lives only in `packages/ledger` and `packages/payments`** — never
inside an app. Build order is in `10`.

## Important caveat

The money-holding posture (ledger + partner-held funds) is the safer technical
design, but **licensing must be confirmed with a Nigerian fintech lawyer and the
payment partner before launch** (see `10` Phase 0). This documentation is a build
guide, not legal advice.
