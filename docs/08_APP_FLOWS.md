# MELD — Application Flows & State Machines

**Version:** 1.0
**Depends on:** all PRDs, `07_DATABASE_SCHEMA.sql`

Diagrams are Mermaid. These are the canonical flows and allowed state transitions.
Backend must enforce transitions; UIs must not offer disallowed actions.

---

## 1. Merchant onboarding

```mermaid
flowchart TD
    A[Visitor on marketing site] -->|Start free| B[Merchant app sign-up]
    B --> C[Account created: pending_approval]
    C --> D[Ops reviews in Ops tool]
    D -->|approve| E[status: approved + fee settings]
    D -->|reject| F[notified, no access]
    E --> G[Merchant can create orders]
    E --> H[merchant_payable ledger account created]
```

## 2. Rider onboarding

```mermaid
flowchart TD
    A[Visitor on marketing site] -->|Become a rider partner| B[Rider application form]
    B --> C[rider_applications: applied]
    C --> D[Ops reviews + manual licence check]
    D -->|approve| E[Create rider account + invite SMS/email]
    D -->|reject| F[reject_reason recorded]
    E --> G[Rider sets password, status: active]
    G --> H[rider_wallet + cash_in_transit accounts created]
```

---

## 3. Order lifecycle (status enum: order_status)

```mermaid
stateDiagram-v2
    [*] --> created
    created --> awaiting_assignment: submitted / stock allocated
    awaiting_assignment --> assigned: Ops assigns rider
    assigned --> out_for_delivery: rider en_route
    out_for_delivery --> delivered: delivery completed (payment gate passed)
    out_for_delivery --> failed: delivery failed
    failed --> awaiting_assignment: retry (reassign)
    delivered --> returned: return initiated (later)
    created --> cancelled: cancelled before dispatch
    delivered --> [*]
    cancelled --> [*]
```

Notes:
- On `created → awaiting_assignment`, inventory is allocated (a negative
  `stock_movements` row + `inventory.quantity` decrement).
- Delivery fee is resolved at `created` via `packages/fees`.

---

## 4. Delivery lifecycle (status enum: delivery_status)

```mermaid
stateDiagram-v2
    [*] --> assigned
    assigned --> accepted: rider accepts
    accepted --> en_route: rider starts
    en_route --> arrived: at customer
    arrived --> delivered: PAYMENT GATE passed
    arrived --> failed: could not deliver
    delivered --> [*]
    failed --> [*]
```

### The payment gate (hard rule)
`arrived → delivered` is allowed **only if**:
- `payment_status = 'paid'` (prepaid via virtual account), **or**
- `cash_collected = true` (COD)

Enforced in `complete_delivery()` server-side, not just UI.

---

## 5. Prepaid payment flow

```mermaid
sequenceDiagram
    participant R as Rider app
    participant P as Payments pkg
    participant PP as Paystack/Flutterwave
    participant W as Webhook (Edge Fn)
    participant L as Ledger
    participant M as Merchant/Rider apps

    R->>P: Generate account number (delivery_id)
    P->>PP: createVirtualAccount
    PP-->>P: account_no
    P-->>R: show account number
    Note over R: Customer transfers funds
    PP->>W: payment.success webhook
    W->>W: verify signature + idempotency
    W->>L: post_ledger_transaction (split proceeds/fee 80/20)
    W->>M: delivery.payment_status = paid (Realtime)
    Note over R: "Paid" appears instantly — no office call
    R->>L: complete_delivery -> delivered
```

## 6. COD flow (cash)

```mermaid
sequenceDiagram
    participant R as Rider app
    participant D as Deliveries
    participant L as Ledger
    participant PP as Partner
    participant O as Ops

    Note over R: Customer pays cash
    R->>D: Mark cash collected (amount)
    D->>L: post (Dr cash_in_transit / Cr merchant_payable(-fee), rider 80%, MELD 20%)
    R->>D: Mark delivered (gate passed)
    Note over R: Later — remit cash
    R->>PP: pay into MELD virtual account (remittance)
    PP->>O: webhook confirms receipt
    O->>L: post (Dr partner_float / Cr cash_in_transit)
    O->>O: reconcile remitted vs owed (flag if mismatch)
```

Merchant is settled proceeds **minus** delivery fee. Rider earns 80% of fee; MELD 20%.

---

## 7. Rider cash remittance (status enum: remittance_status)

```mermaid
stateDiagram-v2
    [*] --> pending: cash_collected
    pending --> remitted: rider pays into VA
    remitted --> reconciled: webhook + Ops confirm (owed == remitted)
    remitted --> flagged: mismatch (owed != remitted)
    flagged --> reconciled: Ops resolves
    reconciled --> [*]
```

---

## 8. Withdrawal / settlement (status enum: withdrawal_status)

```mermaid
stateDiagram-v2
    [*] --> requested: merchant/rider requests (<= balance)
    requested --> processing: payout initiated via partner
    processing --> paid: partner confirms
    processing --> failed: partner error
    failed --> requested: retry
    paid --> [*]
```

Ledger: on `paid`, post `Dr {merchant_payable|rider_wallet} / Cr partner_float`.
Balance check happens before `requested` is accepted — never allow negative.

---

## 9. Dispatch (manual, v1)

```mermaid
flowchart TD
    A[Order awaiting_assignment] --> B[Ops opens dispatch]
    B --> C{Pick active rider}
    C --> D[assign_rider: validate active + available]
    D --> E[delivery.status = assigned]
    E --> F[Notify rider SMS+in-app, merchant in-app]
    F --> G[Customer SMS with tracking link]
```

---

## 10. Inventory receiving (Ops)

```mermaid
flowchart TD
    A[Merchant delivers stock to warehouse] --> B[Ops: Receive inventory]
    B --> C[inventory.quantity += qty]
    C --> D[stock_movements: +qty, reason=received]
    D --> E[Merchant sees updated stock levels]
```
