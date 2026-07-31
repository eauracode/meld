# MELD — Entity-Relationship Diagram

**Version:** 1.0
**Companion to:** `07_DATABASE_SCHEMA.sql`

Rendered with Mermaid. Paste into any Mermaid viewer (or GitHub) to see the diagram.
Money fields are BIGINT kobo; PKs are UUID.

```mermaid
erDiagram
    profiles ||--o| merchants : "has (if merchant)"
    profiles ||--o| riders : "has (if rider)"
    rider_applications ||--o| riders : "becomes"

    merchants ||--o{ products : owns
    products ||--o{ inventory : "stocked as"
    warehouses ||--o{ inventory : holds
    products ||--o{ stock_movements : logs
    warehouses ||--o{ stock_movements : logs

    merchants ||--o{ orders : creates
    orders ||--o{ order_items : contains
    products ||--o{ order_items : "referenced by"
    orders ||--|| deliveries : "fulfilled by"
    riders ||--o{ deliveries : performs

    deliveries ||--o{ virtual_accounts : "may have"
    deliveries ||--o{ payments : "confirmed by"
    deliveries ||--o| cash_remittances : "COD creates"
    riders ||--o{ cash_remittances : owes
    cash_remittances ||--o| virtual_accounts : "remitted via"

    merchants ||--o{ fee_rules : "override (optional)"

    ledger_accounts ||--o{ ledger_entries : "posted to"
    ledger_transactions ||--o{ ledger_entries : groups

    profiles ||--o{ notifications : receives
    profiles ||--o{ audit_log : "acts in"

    profiles {
        uuid id PK
        user_role role
        text full_name
        text phone
    }
    merchants {
        uuid id PK
        uuid profile_id FK
        text business_name
        merchant_status status
        fee_borne_by fee_borne_by
    }
    riders {
        uuid id PK
        uuid profile_id FK
        vehicle_type vehicle
        rider_status status
    }
    rider_applications {
        uuid id PK
        text full_name
        vehicle_type vehicle
        rider_status status
    }
    warehouses {
        uuid id PK
        text name
        text state
    }
    products {
        uuid id PK
        uuid merchant_id FK
        text sku
        text name
        int reorder_level
    }
    inventory {
        uuid id PK
        uuid product_id FK
        uuid warehouse_id FK
        int quantity
    }
    stock_movements {
        uuid id PK
        uuid product_id FK
        int change
        text reason
    }
    fee_rules {
        uuid id PK
        fee_rule_scope scope
        uuid merchant_id FK
        fee_rule_type type
        jsonb by_state
    }
    orders {
        uuid id PK
        uuid merchant_id FK
        text customer_name
        text delivery_state
        bigint order_value_kobo
        payment_type payment_type
        bigint delivery_fee_kobo
        order_status status
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
    }
    deliveries {
        uuid id PK
        uuid order_id FK
        uuid rider_id FK
        delivery_status status
        payment_status payment_status
        boolean cash_collected
        bigint cash_amount_kobo
    }
    virtual_accounts {
        uuid id PK
        text purpose
        uuid delivery_id FK
        text account_no
    }
    payments {
        uuid id PK
        uuid delivery_id FK
        text provider_ref
        bigint amount_kobo
        text method
    }
    cash_remittances {
        uuid id PK
        uuid rider_id FK
        uuid delivery_id FK
        bigint amount_owed_kobo
        bigint amount_remitted_kobo
        remittance_status status
    }
    ledger_accounts {
        uuid id PK
        ledger_account_type type
        text owner_type
        uuid owner_id
    }
    ledger_transactions {
        uuid id PK
        text source_type
        uuid source_id
    }
    ledger_entries {
        uuid id PK
        uuid transaction_id FK
        uuid account_id FK
        bigint debit_kobo
        bigint credit_kobo
    }
    withdrawals {
        uuid id PK
        text owner_type
        uuid owner_id
        bigint amount_kobo
        withdrawal_status status
    }
    notifications {
        uuid id PK
        uuid recipient_id FK
        text event
        notification_channel channels
    }
    audit_log {
        uuid id PK
        uuid actor_id FK
        text action
    }
```

## Reading the money path

1. `orders` → one `deliveries` row (v1: one delivery per order).
2. Delivery payment resolves through `virtual_accounts` (prepaid) or
   `cash_remittances` (COD) → confirmed in `payments`.
3. Every money event posts a `ledger_transactions` with balanced `ledger_entries`
   against `ledger_accounts`.
4. Balances (merchant payable, rider wallet, MELD revenue, cash in transit, partner
   float) are **derived** from `ledger_entries` via the `ledger_balances` view — never
   stored as mutable columns.
5. `withdrawals` move money out (merchant settlement / rider payout) via the partner,
   posting the matching ledger entries.
