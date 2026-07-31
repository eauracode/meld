# MELD — Operations Tool PRD

**Version:** 1.0
**Surface:** `apps/ops`
**Depends on:** `00_MASTER_PRD.md`, `01_SHARED_FOUNDATIONS.md`
**Auth:** Supabase Auth, roles `ops_agent`, `ops_admin`
**Users:** MELD internal team

---

## 1. Purpose

The control room. Ops approves merchants and riders, receives inventory into
warehouses, assigns riders to deliveries, sets delivery fees, reconciles COD cash, and
oversees the ledger and payouts. This surface has the broadest data access and the
most sensitive actions.

---

## 2. Core features (v1)

### 2.1 Approvals
- **Merchant approvals**: queue of `pending_approval` merchants → review details →
  approve/reject. On approve, set `fee_borne_by` and any per-merchant fee override.
- **Rider approvals**: queue of `rider_applications` (from marketing site) → review
  (manual document/licence check) → approve (creates rider account, sends invite) or
  reject.

### 2.2 Warehouse & inventory
- Register warehouses (name, location/state).
- **Receive inventory**: record stock received from a merchant into a warehouse
  (merchant, product/SKU, quantity) → increments inventory the merchant sees.
- Adjust stock (corrections, damages) with reason (audited).
- View stock across merchants/warehouses.

### 2.3 Orders & dispatch
- See all orders across merchants; filter by status/state/merchant.
- **Assign rider** to a delivery (manual dispatch in v1): pick an `active` rider →
  delivery moves to `assigned`, rider + merchant notified.
- Reassign / cancel where needed (audited).

### 2.4 Delivery fees
- Manage the **global fee table** (intrastate flat per state; interstate by
  destination state) — `ops_admin` only.
- Manage **per-merchant overrides** — `ops_admin` only.
- All fee changes are versioned (`effective_from`) and audited.

### 2.5 Cash reconciliation
- **COD oversight**: see cash collected vs remitted per rider.
- Reconcile remittances (partner webhook auto-confirms; Ops resolves discrepancies).
- Flag/track riders with outstanding or mismatched cash.

### 2.6 Ledger & payouts
- View the **ledger** (all accounts, all entries) with filters and running balances.
- Oversee **withdrawals/settlements**: see requested/processing/paid; retry failures.
- Manual ledger adjustments (`ops_admin` only, reason required, fully audited) for
  edge cases — used sparingly.
- Daily reconciliation view: partner float (real) vs ledger partner-float account.

### 2.7 Users & audit
- Invite/manage Ops staff (`ops_admin`).
- Suspend/reactivate merchants and riders.
- **Audit log**: every sensitive action (approvals, fee changes, assignments,
  adjustments, suspensions) recorded with actor + timestamp.

### 2.8 Notifications & monitoring
- Dashboards: deliveries in progress, deliveries stuck, unremitted cash, pending
  approvals, failed payouts.

---

## 3. Functional requirements

- **FR-1** Role separation: `ops_agent` handles day-to-day (approvals, dispatch,
  receiving); `ops_admin` handles fees, payouts config, manual ledger adjustments,
  user management.
- **FR-2** Every sensitive action writes to `audit_log`.
- **FR-3** Manual ledger adjustments must balance (debits = credits) — same ledger
  rules as automatic postings.
- **FR-4** Fee changes are versioned, never destructive.
- **FR-5** Ops can see all data (RLS grants ops roles broad read; writes gated by
  role).
- **FR-6** Dispatch assignment validates rider is `active` and available.

---

## 4. Data this surface touches

Broad read across all business tables; writes to: `merchants` (approval/state),
`rider_applications` + `profiles` (approval), `warehouses`, `inventory` (receive/
adjust), `deliveries` (assign/reassign), `fee_rules`, `cash_remittances`
(reconcile), `ledger_entries` (adjustments — admin), `withdrawals` (oversight),
`audit_log`.

---

## 5. Long-term (not v1)

Automated dispatch engine, SLA monitoring and alerts, performance analytics, finance
exports/accounting integration, role granularity, multi-warehouse routing.
