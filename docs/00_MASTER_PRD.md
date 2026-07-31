# MELD — Master Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Foundational — north star for all four surfaces
**Owner:** MELD
**Tagline:** Powering every step of e-commerce.

> This document is the single source of truth for *what* MELD is and *why*. Every
> other document (per-surface PRDs, TRD, schema, flows, UI/UX, implementation plan)
> derives from this one. When they conflict, this document and `01_SHARED_FOUNDATIONS.md`
> win.

---

## 1. Vision

MELD is the operations layer behind e-commerce businesses in Nigeria. Merchants
already sell wherever they sell — Instagram, WhatsApp, their own sites, marketplaces.
MELD takes over everything that happens *after the sale*: storing goods, fulfilling
orders, delivering nationwide, collecting payment (including cash on delivery), and
settling money to everyone involved.

The core promise: **many operations, melded into one reliable partner.** Instead of a
merchant juggling a warehouse here, a dispatch rider there, a POS terminal, and a
spreadsheet to track who owes what, MELD runs the whole chain and shows every party
exactly where things stand.

### The one-line test
Every feature we build must answer yes to: *does this help many operations become
one, reliably?* If not, it does not belong in MELD.

---

## 2. The four surfaces

MELD is delivered through four connected web applications sharing one backend, one
database, and one identity system.

| # | Surface | Primary user | Purpose |
|---|---------|-------------|---------|
| 1 | **Marketing website** | Prospective merchants and riders | Explain MELD, convert merchants to sign-up, capture rider applications |
| 2 | **Merchant app** | E-commerce sellers | Create orders, manage inventory in MELD warehouses, track deliveries, see money owed, withdraw earnings |
| 3 | **Rider app** | Delivery partners | Receive assigned deliveries, collect payment (transfer or cash), remit cash, accumulate and withdraw earnings |
| 4 | **Operations tool** | MELD internal team | Approve merchants and riders, manage warehouses and inventory, assign riders to deliveries, set fees, reconcile cash, oversee the ledger |

All four are **mobile-first responsive web apps** (PWA-capable). No native apps in v1.

### How they connect
- A merchant signs up on the **marketing site** → handed off to the **merchant app**.
- A rider applies on the **marketing site** → the application appears in the **ops tool** → Ops approves → rider gets access to the **rider app**.
- A merchant creates an order in the **merchant app** → it appears in the **ops tool** → Ops assigns a rider → it appears in the **rider app**.
- Money movements from any surface post to one shared **ledger** visible to Ops.

---

## 3. Business model

### Revenue (v1)
MELD charges the **merchant a delivery fee** per delivery. Every delivery fee splits
automatically:
- **80% to the rider** who performs the delivery
- **20% to MELD**

This split is automatic and recorded in the ledger at the moment a delivery is
completed. Other revenue streams (storage fees, SaaS subscription, value-added
services) are explicitly **out of scope for v1** but the ledger is designed to
accommodate them later.

### Delivery fee calculation
The delivery fee is **set by MELD**, calculated primarily by **zone/distance**
(intrastate vs interstate, and by destination state, since fees differ per state).
Crucially, the **Ops admin can override the rule per merchant**, because some
merchants have negotiated custom rates. See `01_SHARED_FOUNDATIONS.md` §5 for the
full fee-resolution logic.

### Money-holding posture (critical)
MELD does **not** hold customer or merchant funds as a licensed deposit-taker.
Instead:
- The **actual money** sits with a **licensed payment partner** (Paystack and/or
  Flutterwave) or a partner bank.
- MELD keeps an **internal double-entry ledger** — a precise record of who is owed
  what (merchant balances, rider balances, MELD revenue).
- A "withdrawal" or "settlement" triggers a **real payout via the licensed partner**,
  and the ledger records the movement.

> ⚠️ **Legal note (not legal advice):** Operating wallets/balances and moving money
> in Nigeria touches CBN-regulated activity (PSSP/PTSP/PSP licensing). The design
> above (ledger + partner-held funds + partner-executed payouts) is the safer
> technical posture, but **MELD must confirm the arrangement with a Nigerian fintech
> lawyer and with the payment partner** before going live. This is captured as a
> launch blocker in `10_IMPLEMENTATION_PLAN.md`.

---

## 4. How money moves (the heart of the system)

There are two payment scenarios for any order. In both, **a rider cannot complete a
delivery unless payment is accounted for.**

### Scenario A — Prepaid / transfer
1. Rider generates a **one-time virtual account number** (via the payment partner)
   for the specific delivery.
2. Customer transfers the order amount into that virtual account.
3. Payment confirmation is **instant and automatic** — the rider sees "paid" without
   calling the office.
4. Rider completes the delivery.
5. Ledger settles: merchant is credited the order proceeds; MELD's delivery fee and
   the rider's 80% share are recorded.

### Scenario B — Cash on delivery (COD)
1. Customer pays the rider in **cash**.
2. Rider marks **"cash collected"** at delivery — this unblocks delivery completion.
3. Rider later performs a **"remit cash" step**: MELD generates a **virtual account**
   the rider pays the collected cash into (via agent/POS/transfer). Ops reconciles the
   remitted amount against what was owed.
4. Ledger settles. **The amount remitted to the merchant excludes MELD's delivery
   fee** (MELD nets its fee from COD proceeds).

### What the merchant sees
For every delivery, the merchant gets a **breakdown report**: the delivery fee
charged, how much the customer paid (and by what method), and — for COD — what they
are owed after the delivery fee is deducted.

### The 80/20 split, concretely
When a delivery completes and its fee is, say, ₦2,000:
- Rider wallet is credited **₦1,600**
- MELD revenue is credited **₦400**
This happens automatically via ledger entries. Riders withdraw their accumulated
wallet balance anytime; merchants are settled their order proceeds.

---

## 5. Personas

### Merchant — "Amara, the seller"
Runs a growing fashion business selling on Instagram and WhatsApp. Ships 30–200
orders a week. Today she coordinates a warehouse, two dispatch riders, and a
notebook of who paid what. She wants one place to drop off stock, create orders,
and see exactly how much money is hers and when she'll get it. **Cares about:**
clarity on money, reliable delivery, not chasing riders.

### Rider — "Tunde, the delivery partner"
Delivers for MELD across Lagos. Wants steady deliveries, to know he'll be paid on
time, and to not have to call the office to confirm customer payments. **Cares
about:** fast payouts, a clear list of today's deliveries, simple cash remittance.

### Ops team member — "Ngozi, operations"
Works at MELD. Approves new merchants and riders, receives merchant inventory into
warehouses, assigns riders to deliveries, sets delivery fees, and reconciles cash at
day's end. **Cares about:** control, oversight, catching money discrepancies,
efficiency at scale.

### End customer — "the buyer" (not a system user)
Buys from a merchant, receives goods from a MELD rider, pays by transfer or cash.
**Never logs in.** Receives SMS/WhatsApp/email tracking updates and a tracking link.

---

## 6. Scope: v1 vs. long-term vision

### v1 (lean, buildable first)
- Merchant onboarding (self-serve sign-up → Ops approval)
- Rider onboarding (apply on site → Ops approval)
- Inventory management in MELD warehouses (receive stock, track stock levels)
- Order creation (manual entry + CSV upload)
- Manual rider assignment by Ops
- Rider delivery flow with payment collection (virtual account + COD)
- COD cash remittance + Ops reconciliation
- Double-entry ledger with automatic 80/20 split
- Merchant and rider wallets + withdrawals via payment partner
- Per-delivery breakdown reporting for merchants
- Notifications: SMS + email + in-app
- Ops oversight of everything above

### Long-term vision (explicitly later, but architected for)
- Automated/algorithmic rider dispatch
- Platform integrations (Shopify, WooCommerce, marketplaces) for order import
- Multi-warehouse routing and inventory optimization
- Advanced analytics and forecasting for merchants
- WhatsApp as a first-class notification channel
- Additional revenue lines (storage fees, subscriptions, insurance, financing)
- Customer-facing accounts / self-service returns
- Rider mobile-native app with background GPS and live tracking
- Public API for merchants

Anything in the vision list must not be *built* in v1, but the data model and
architecture must not *preclude* it. The schema in `07_DATABASE_SCHEMA.sql` is
designed with these in mind (e.g. an extensible ledger, a fee-rules engine, an
orders table that can carry an external source id).

---

## 7. Success metrics (v1)

| Metric | Why it matters |
|--------|----------------|
| Merchant activation rate (signed up → first order created) | Proves onboarding works |
| Deliveries completed per week | Core throughput |
| % deliveries completed without an Ops phone call for payment confirmation | Proves the virtual-account/instant-confirmation value prop |
| COD cash reconciliation accuracy (remitted vs owed) | Proves the money system is trustworthy |
| Ledger integrity (debits = credits, always) | Non-negotiable correctness |
| Time from delivery completion to rider wallet credit | Proves "paid on time" |
| Rider withdrawal success rate | Proves payouts work |

---

## 8. Non-goals for v1 (say no on purpose)

- MELD does **not** build the merchant's storefront or process the customer's
  original purchase. Ops begins at order creation.
- MELD does **not** hold funds as a licensed wallet; it keeps a ledger and pays out
  via a partner.
- **No** native mobile apps.
- **No** automated dispatch, **no** platform integrations, **no** customer logins.
- **No** multi-currency; Naira only.

---

## 9. Document map

| File | Purpose |
|------|---------|
| `00_MASTER_PRD.md` | This document — vision, model, scope |
| `01_SHARED_FOUNDATIONS.md` | Tech stack, monorepo, auth, ledger & payment design, notifications, fee engine |
| `02_PRD_Marketing.md` | Marketing website product spec |
| `03_PRD_Merchant.md` | Merchant app product spec |
| `04_PRD_Rider.md` | Rider app product spec |
| `05_PRD_Ops.md` | Operations tool product spec |
| `06_TRD_and_Architecture.md` | Technical design, APIs, security, integrations |
| `07_DATABASE_SCHEMA.sql` | Executable Postgres schema |
| `07_ER_DIAGRAM.md` | Entity-relationship diagram |
| `08_APP_FLOWS.md` | End-to-end flows and state machines |
| `09_UIUX_SPEC.md` | Screens and design system per surface |
| `10_IMPLEMENTATION_PLAN.md` | Build order, milestones, agent hand-off |
