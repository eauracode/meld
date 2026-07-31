# MELD — Merchant App PRD

**Version:** 1.0
**Surface:** `apps/merchant`
**Depends on:** `00_MASTER_PRD.md`, `01_SHARED_FOUNDATIONS.md`
**Auth:** Supabase Auth, role `merchant`
**Users:** e-commerce sellers

---

## 1. Purpose

Give merchants one place to run everything after a sale: get inventory into MELD
warehouses, create orders, track deliveries, and see and withdraw their money — with
a clear breakdown of every delivery's fee and payment.

---

## 2. Onboarding & account states

1. Merchant arrives from the marketing site "Start free" → sign-up (email + phone +
   business details).
2. Account is created `pending_approval`. Merchant can explore but **cannot create
   live orders** until approved.
3. Ops reviews in the Ops tool → `approved`.
4. Approved merchant can transact.

Business profile fields: business name, contact person, phone, email, pickup/return
address, bank account (for settlements), `fee_borne_by` preference (set by Ops per
agreement).

---

## 3. Core features (v1)

### 3.1 Dashboard
At-a-glance: orders today / this week, deliveries in progress, **available balance**
(from ledger `merchant payable`), low-stock alerts. Available balance is the hero
number (lime).

### 3.2 Inventory
- View products and **stock levels held in MELD warehouse(s)**.
- Add/edit products (SKU, name, description, unit, reorder threshold).
- See stock movements (received, allocated to orders, delivered).
- Stock is decremented when an order is created/fulfilled; incremented when Ops
  receives new inventory (recorded in the Ops tool).
- Low-stock alerts (in-app + optional email).

> Note: physical receiving of stock into the warehouse is an **Ops** action
> (`05_PRD_Ops`). The merchant *sees* the resulting levels here.

### 3.3 Orders
- **Create order** manually: customer name, phone, delivery address (state + area),
  items (from inventory), order value, payment type (**prepaid** or **COD**).
- **CSV bulk upload**: template with the same fields; validate rows; show errors;
  import valid rows.
- Order list with status (see state machine in `08_APP_FLOWS.md`): `created` →
  `awaiting_assignment` → `assigned` → `out_for_delivery` → `delivered` /
  `failed` / `returned`.
- Order detail: items, customer, assigned rider (once assigned), payment status,
  delivery fee (resolved by the fee engine at creation), and the money breakdown.

### 3.4 Delivery tracking
- Per order: current status, assigned rider (name/phone), and payment status.
- Realtime updates (Supabase Realtime) as the rider progresses.

### 3.5 Money & wallet
- **Available balance** (merchant payable, settled and withdrawable).
- **Per-delivery breakdown report** (required): for each delivery — delivery fee
  charged, amount the customer paid, payment method, and (COD) net owed to merchant
  after fee. Exportable (CSV).
- **Withdraw**: request payout of available balance to the registered bank account →
  triggers a partner payout → ledger posts `Dr merchant payable / Cr partner float`.
- Transaction history from the ledger (credits from deliveries, debits for
  withdrawals).

### 3.6 Notifications
In-app + email for: order created, rider assigned, out for delivery, delivered,
payment received, withdrawal processed.

---

## 4. Functional requirements

- **FR-1** Merchant sees only their own data (enforced by RLS).
- **FR-2** Cannot create live orders while `pending_approval`.
- **FR-3** Delivery fee is resolved and displayed at order creation using
  `packages/fees` (per-merchant override respected).
- **FR-4** COD orders show the money split clearly: what the customer pays, what MELD
  keeps (fee), what the merchant nets.
- **FR-5** Withdrawals only up to available balance; never negative.
- **FR-6** All money read from the ledger, never a mutable "balance" column.
- **FR-7** CSV import validates and reports per-row errors; partial import allowed.
- **FR-8** Mobile-first responsive; PWA installable.

---

## 5. Data this surface touches

Reads/writes (own rows only): `merchants`/`profiles`, `products`, `inventory`,
`orders`, `order_items`, `deliveries` (read), `ledger_entries` (read, own accounts),
`withdrawals` (create), `notifications` (read). Fee resolution via `packages/fees`.

---

## 6. Long-term (not v1)

Platform integrations for auto order import, returns management, analytics/forecasts,
multi-warehouse selection, sub-users/teams, public API.
