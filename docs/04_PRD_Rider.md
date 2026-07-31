# MELD — Rider App PRD

**Version:** 1.0
**Surface:** `apps/rider`
**Depends on:** `00_MASTER_PRD.md`, `01_SHARED_FOUNDATIONS.md`
**Auth:** Supabase Auth, role `rider`
**Users:** delivery partners

---

## 1. Purpose

Give riders a simple, mobile-first tool to: see today's assigned deliveries, collect
payment (transfer via one-time virtual account, or cash), remit collected cash, and
watch their earnings accumulate and withdraw anytime. The defining constraint:
**a rider cannot complete a delivery unless payment is accounted for.**

---

## 2. Onboarding & account states

1. Rider applies on the marketing site (`rider_applications`).
2. Ops reviews and approves in the Ops tool → a rider account is created and the rider
   is invited (SMS + email) to set a password.
3. State: `applied` → `approved` → `active`. Only `active` riders receive
   assignments. Ops can `suspend`.

Profile: full name, phone, city/state, vehicle type, licence status, bank account
(for withdrawals).

---

## 3. Core features (v1)

### 3.1 Deliveries list ("Today")
- Assigned deliveries (assigned by Ops), each showing: customer name/phone, address,
  items, order value, **payment type** (prepaid/COD), delivery fee, and current
  status.
- Realtime: new assignments appear instantly (Supabase Realtime + SMS alert).

### 3.2 Delivery detail & flow
Status path: `assigned` → `accepted` → `en_route` → `arrived` → (payment) →
`delivered` / `failed`. Full state machine in `08_APP_FLOWS.md`.

**Payment collection is the gate to completion:**

**Case A — Prepaid / transfer:**
1. Rider taps **"Generate account number"** → `packages/payments` creates a
   dedicated one-time virtual account for this delivery.
2. Customer transfers the amount. Partner webhook confirms → delivery
   `payment_status` flips to `paid` **instantly** (Realtime). No office call.
3. Rider can now mark **delivered**.

**Case B — Cash on delivery (COD):**
1. Rider collects cash, taps **"Mark cash collected"** → records the collected amount;
   ledger posts to **cash in transit** (see `01_SHARED_FOUNDATIONS §4`).
2. This **unblocks** marking the delivery **delivered**.
3. The rider now owes MELD the cash → a **remittance obligation** is created.

**Completion rule (hard):** the "Delivered" action is **disabled** until either
`payment_status = paid` (prepaid) or `cash_collected = true` (COD). Enforced in the UI
*and* in the backend (RLS/policy + a check in the completion function) so it cannot be
bypassed.

### 3.3 Cash remittance
- A **"Cash to remit"** area shows outstanding COD cash the rider holds.
- Rider taps **"Remit cash"** → MELD generates a **virtual account** (via
  `packages/payments`) for remittance; rider pays the cash in (agent/POS/transfer).
- Partner webhook confirms receipt → ledger moves **cash in transit → partner float**;
  Ops sees it reconciled. The rider's outstanding cash reduces accordingly.
- Ops can flag discrepancies (remitted ≠ owed) for follow-up.

### 3.4 Earnings & wallet
- **Wallet balance** = accumulated 80% shares (ledger `rider wallet`). Hero number.
- On each completed delivery, the rider is auto-credited 80% of the delivery fee
  (posted at completion).
- **Withdraw anytime** to the registered bank account → partner payout → ledger posts
  `Dr rider wallet / Cr partner float`.
- Earnings history: per-delivery share, withdrawals.

### 3.5 Notifications
In-app + SMS for: new assignment, payment received (instant), cash remittance due,
withdrawal processed, approval.

---

## 4. Functional requirements

- **FR-1** Rider sees only their own assigned deliveries and wallet (RLS).
- **FR-2** "Delivered" is blocked unless prepaid-paid or cash-collected — enforced
  server-side, not just UI.
- **FR-3** Virtual account generation is idempotent per delivery (no duplicate
  accounts).
- **FR-4** Payment confirmation is realtime via partner webhook → ledger → Realtime.
- **FR-5** Cash remittance reconciles cash-in-transit to partner-float via webhook.
- **FR-6** 80% share auto-posted at completion using the split constant.
- **FR-7** Withdrawals only up to wallet balance; never negative.
- **FR-8** Mobile-first, PWA installable, works on low-end Android browsers and patchy
  networks (optimistic UI where safe, but never for money confirmations).

---

## 5. Data this surface touches

Reads/writes (own rows only): `profiles` (rider), `deliveries` (assigned),
`payments`/`virtual_accounts` (create/read), `cash_remittances` (create/read),
`ledger_entries` (read, rider wallet + cash in transit), `withdrawals` (create),
`notifications` (read).

---

## 6. Long-term (not v1)

Native app with background GPS + live customer tracking, automated dispatch
acceptance, route optimization, in-app navigation, ratings, tiered incentives.
