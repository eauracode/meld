# MELD — Shared Foundations

**Version:** 1.0
**Status:** Foundational — read before building any surface
**Depends on:** `00_MASTER_PRD.md`

> This document defines everything the four surfaces share: the tech stack, the
> monorepo layout, the identity model, the money/ledger design, the fee engine, and
> notifications. It is the contract that keeps four apps consistent. AI agents
> building any surface must read this first.

> **Architecture update (2026-07-30):** the backend moved from Supabase to a
> self-hosted NestJS API + Postgres, both on Render — matching the pattern already
> proven on CashOS and Vendoor Africa, rather than introducing a new BaaS dependency.
> §1 and §3 below reflect the current decision. Money logic is unaffected: it lives
> in `packages/ledger`/`packages/fees`/`packages/payments`/`packages/notifications`
> regardless of which backend calls them. A `supabase/` directory may still exist in
> the repo from the earlier approach — it is superseded, not deleted, and should not
> be extended further.

---

## 1. Technology stack (locked)

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | **TypeScript** everywhere | Shared types across all surfaces |
| Backend | **NestJS** (`apps/api`) | One API, all four frontends call it |
| Database | **PostgreSQL** (Render managed) | Schema per `07_DATABASE_SCHEMA.sql`, minus Supabase-specific `auth.*` bits |
| ORM / migrations | **Prisma** | Typed client; migrations are plain SQL under the hood |
| Web framework | **Next.js (App Router)** | All four frontends |
| Styling | **Tailwind CSS** | Brand tokens defined once, shared |
| Auth | **JWT** (issued by `apps/api`, bcrypt password hashing) | One identity system; roles distinguish surfaces |
| Realtime | **Socket.io** (from `apps/api`) | Replaces Supabase Realtime — same instant-payment-confirmation requirement |
| Payments/payouts | **Paystack and/or Flutterwave** | Virtual accounts, transfers, payouts |
| SMS | **Termii** (Nigeria-focused) | v1 SMS channel |
| Email | **Resend** | Transactional email |
| Hosting | **Render** (frontends + API + Postgres, all in one place) | Matches CashOS/Vendoor Africa |
| Monorepo tooling | **Turborepo + pnpm** | Shared packages, one install |

### Why one shared backend, not four
Money correctness demands a single source of truth. A rider's wallet, a merchant's
balance, and MELD's revenue are three views of the *same* ledger. Splitting the
backend would mean reconciling money across services — the exact problem MELD exists
to remove. One Postgres database is simpler, safer, and far easier to build against
consistently — access control is enforced in NestJS guards/services rather than
Postgres RLS, since there is no `auth.uid()`-equivalent without Supabase; the
boundary moves up a layer but the principle (never trust the client, check on every
request) is unchanged.

---

## 2. Monorepo layout

```
meld/
├── apps/
│   ├── marketing/        # Next.js — public site (02_PRD_Marketing)
│   ├── merchant/         # Next.js — merchant app (03_PRD_Merchant)
│   ├── rider/            # Next.js — rider app (04_PRD_Rider)
│   ├── ops/              # Next.js — operations tool (05_PRD_Ops)
│   └── api/              # NestJS — the one backend all four frontends call
├── packages/
│   ├── db/                # (legacy) Supabase client — superseded by apps/api's Prisma client
│   ├── ledger/            # Double-entry ledger logic (the money core)
│   ├── fees/              # Delivery-fee resolution engine
│   ├── auth/              # Shared role-guard helpers (types only; enforcement lives in apps/api)
│   ├── ui/                # Shared React components in the MELD brand system
│   ├── notifications/     # SMS + email + in-app dispatch
│   ├── payments/          # Paystack/Flutterwave adapters (virtual accts, payouts)
│   └── types/              # Shared domain types (Order, Delivery, LedgerEntry, ...)
├── supabase/              # Superseded — kept for reference, not extended further
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Rule for agents:** money logic lives ONLY in `packages/ledger` and
`packages/payments`. No app writes ledger rows directly; they call the ledger
package. This keeps the money core auditable in one place.

---

## 3. Identity & roles

One `auth.users` table (Supabase). Every user has exactly one **primary role**, but
the model allows a person to hold more than one over time (rare). A `profiles` table
extends `auth.users` with MELD-specific fields and the role.

### Roles
| Role | Surface access | Notes |
|------|---------------|-------|
| `merchant` | Merchant app | Created via self-serve sign-up; must be `approved` by Ops to transact |
| `rider` | Rider app | Created from an approved rider application; `active` after approval |
| `ops_agent` | Ops tool | MELD staff; created/invited by an admin |
| `ops_admin` | Ops tool | MELD staff with elevated rights (fees, payouts, user management) |

The marketing site requires no auth.

### Access control
- Enforced with **Postgres Row-Level Security (RLS)** on every table. A merchant can
  only read/write their own orders; a rider only their assigned deliveries; Ops sees
  all. Exact policies are in `07_DATABASE_SCHEMA.sql`.
- Frontends also guard routes by role, but **RLS is the real boundary** — never trust
  the client.

### Account states
- Merchant: `pending_approval` → `approved` → (`suspended`)
- Rider: `applied` → `approved`/`rejected` → `active` → (`suspended`)

---

## 4. The money core — double-entry ledger

This is the most important part of the system. Get it right and everything else is
reporting.

### Principle
Every money movement is recorded as **balanced ledger entries**: total debits equal
total credits, always. MELD never "just updates a balance" — it posts entries, and
balances are derived from entries. This makes the system auditable and makes
discrepancies impossible to hide.

### Accounts
The ledger tracks balances for these account types (see `ledger_accounts` in the
schema):
- **Merchant payable** — money MELD owes a merchant (order proceeds not yet settled)
- **Rider wallet** — money MELD owes a rider (accumulated 80% shares)
- **MELD revenue** — MELD's 20% delivery-fee income
- **Cash in transit** — COD cash a rider has collected but not yet remitted
- **Partner float** — funds held at Paystack/Flutterwave (the real money)
- **Suspense** — for unmatched/under-reconciliation amounts

### Example postings

**Prepaid delivery, order proceeds ₦20,000, delivery fee ₦2,000:**
```
On payment confirmed (customer → virtual account, ₦22,000 total collected*):
  Dr Partner float            ₦22,000
    Cr Merchant payable         ₦20,000
    Cr Rider wallet             ₦1,600   (80% of 2,000)
    Cr MELD revenue             ₦400     (20% of 2,000)
```
*Whether the customer pays goods+fee or just goods depends on merchant agreement;
the fee source (customer vs merchant) is a per-merchant setting. The ledger handles
both — see §5.

**COD delivery, goods ₦20,000, delivery fee ₦2,000, customer pays ₦20,000 cash:**
```
On "cash collected":
  Dr Cash in transit          ₦20,000
    Cr Merchant payable         ₦18,000   (proceeds minus delivery fee)
    Cr Rider wallet             ₦1,600
    Cr MELD revenue             ₦400

On "cash remitted" (rider pays ₦20,000 into MELD virtual account, Ops reconciles):
  Dr Partner float            ₦20,000
    Cr Cash in transit          ₦20,000
```
Merchant is settled ₦18,000 (excludes the ₦2,000 fee, exactly as specified). Rider
earned ₦1,600; MELD earned ₦400.

**Rider withdrawal ₦50,000:**
```
  Dr Rider wallet             ₦50,000
    Cr Partner float            ₦50,000    (a real payout is executed via partner)
```

### Rules for agents
- All postings go through `packages/ledger`'s `postTransaction(entries[])`, which
  **rejects** any transaction where debits ≠ credits.
- Every posting references a `source` (e.g. delivery id, withdrawal id) for
  traceability.
- Balances are computed by summing entries, optionally cached in a materialized view
  for performance.
- Money is stored in **integer kobo** (₦1 = 100 kobo). Never floats. All amounts in
  the schema are `bigint` kobo.

---

## 5. Delivery-fee engine

Lives in `packages/fees`. Resolves the fee for a delivery at creation time.

### Resolution order (first match wins)
1. **Per-merchant override rule** — if Ops has set a custom rule for this merchant
   (flat, or a per-state table), use it.
2. **Zone/state rule** — the default MELD fee table keyed by:
   - `intrastate` (origin state == destination state): a flat fee per state, and
   - `interstate`: a fee by destination state.
3. **Fallback default** — a configured base fee if nothing matches.

### Fee rule shape (stored in `fee_rules`)
- `scope`: `global` | `merchant`
- `merchant_id`: null for global, set for overrides
- `type`: `flat` | `by_state`
- `intrastate_fee_kobo`, and a `by_state` JSON map `{ "Lagos": 150000, "Kano": 350000, ... }` (values in kobo)
- `effective_from`, `effective_to` for auditability

### Who bears the fee
A per-merchant setting `fee_borne_by`: `customer` (added to what the customer pays)
or `merchant` (deducted from proceeds). This affects the ledger postings in §4 but
not the split — the 80/20 always applies to the fee amount.

### The split
The 80/20 rider/MELD split is a **system constant** (`RIDER_SHARE_BPS = 8000` basis
points) but stored in config so it can change without code edits. Applied
automatically at delivery completion.

---

## 6. Payments integration (Paystack / Flutterwave)

Lives in `packages/payments`. Abstracted behind an interface so either partner (or
both) can be used.

### Capabilities needed
- **Dedicated virtual accounts** — generate a one-time/dedicated account number for
  a delivery (prepaid) or for COD remittance. Customer/rider pays in; a **webhook**
  confirms receipt instantly.
- **Transfers/payouts** — execute merchant settlements and rider withdrawals to bank
  accounts.
- **Webhooks** — Supabase Edge Function receives payment events, verifies signature,
  posts to the ledger. **Idempotent** — the same event never double-posts.

### Instant confirmation (the rider value prop)
When a customer pays into the delivery's virtual account, the partner webhook fires →
Edge Function verifies and posts the ledger entry → the delivery's `payment_status`
flips to `paid` → the rider app (Supabase Realtime) updates instantly. No phone call.

### Security
- Verify every webhook signature.
- Store partner keys in environment secrets, never in the repo.
- Reconcile daily: partner balance vs `partner float` ledger account.

---

## 7. Notifications

Lives in `packages/notifications`. Three channels in v1: **SMS (Termii)**, **email
(Resend)**, **in-app** (a `notifications` table + Realtime).

### Who gets what (examples)
| Event | Customer | Merchant | Rider | Ops |
|-------|----------|----------|-------|-----|
| Order created | — | in-app | — | in-app |
| Rider assigned | SMS (tracking link) | in-app | in-app + SMS | — |
| Out for delivery | SMS/email | in-app | — | — |
| Payment received | — | in-app | in-app (instant) | — |
| Delivered | SMS/email | in-app + email | — | — |
| Cash remittance due | — | — | in-app + SMS | in-app |
| Withdrawal processed | — | email | SMS + in-app | — |
| Rider/merchant approved | — | email | SMS + email | — |

Customers never log in, so they only receive SMS/email + a public tracking link
(no account). WhatsApp is deferred but the dispatcher interface is channel-agnostic
so it can be added later.

---

## 8. Shared brand system (for `packages/ui`)

All surfaces use the locked MELD "Bold Tech" identity. Full detail in `09_UIUX_SPEC.md`;
the tokens:

**Colors:** Ink `#0C1410` (dominant), Electric Lime `#B6F542` (accent only, ≤10%),
Green `#3F8A66`, Pine `#2E6B4F`, Mist `#F2F5F0`, Slate `#5F7D6E`, White `#FFFFFF`.
Ratio ≈ 65% ink / 25% greens+mist / 10% lime.

**Type:** Century Schoolbook (fallback Georgia) bold serif for headings; Calibri
(fallback Arial) for body/UI/numbers.

**Contrast rule (critical):** set text color explicitly per section — ink/slate on
light backgrounds, white/`#9DB3A8` on dark. Never rely on inheritance.

**Logo:** four strands converging to a lime node (SVG component in `packages/ui`).

---

## 9. Cross-cutting conventions

- **Money:** integer kobo (`bigint`), never floats.
- **IDs:** UUID v4 primary keys everywhere.
- **Timestamps:** `timestamptz`, UTC in DB, displayed in WAT (Africa/Lagos).
- **Soft deletes:** `deleted_at` where history matters (never hard-delete money or
  orders).
- **Audit:** `created_at`, `updated_at`, `created_by` on core tables; an `audit_log`
  table for sensitive Ops actions (fee changes, approvals, manual ledger adjustments).
- **State machines:** orders, deliveries, withdrawals, and remittances each have an
  explicit status enum with allowed transitions (see `08_APP_FLOWS.md`).
- **Environments:** `local` → `staging` → `production`, each its own Supabase project.
