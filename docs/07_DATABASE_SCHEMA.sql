-- =============================================================================
-- MELD — Database Schema (PostgreSQL / Supabase)
-- Version: 1.0
-- Money is stored as BIGINT kobo (₦1 = 100 kobo). Never floats.
-- IDs are UUID. Timestamps are timestamptz (UTC).
-- This file is the source of truth for supabase/migrations.
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
create type user_role          as enum ('merchant','rider','ops_agent','ops_admin');
create type merchant_status    as enum ('pending_approval','approved','suspended');
create type rider_status       as enum ('applied','approved','rejected','active','suspended');
create type vehicle_type       as enum ('bike','car','van');
create type fee_borne_by       as enum ('customer','merchant');
create type payment_type       as enum ('prepaid','cod');
create type payment_status     as enum ('unpaid','pending','paid','failed');
create type order_status        as enum ('created','awaiting_assignment','assigned','out_for_delivery','delivered','failed','returned','cancelled');
create type delivery_status    as enum ('assigned','accepted','en_route','arrived','delivered','failed');
create type withdrawal_status  as enum ('requested','processing','paid','failed');
create type remittance_status  as enum ('pending','remitted','reconciled','flagged');
create type ledger_account_type as enum ('merchant_payable','rider_wallet','meld_revenue','cash_in_transit','partner_float','suspense');
create type fee_rule_scope     as enum ('global','merchant');
create type fee_rule_type      as enum ('flat','by_state');
create type notification_channel as enum ('sms','email','in_app');

-- -----------------------------------------------------------------------------
-- PROFILES  (extends auth.users)
-- -----------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null,
  full_name     text not null,
  phone         text,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- MERCHANTS
-- -----------------------------------------------------------------------------
create table merchants (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid not null references profiles(id) on delete restrict,
  business_name   text not null,
  contact_person  text,
  phone           text,
  email           text,
  pickup_address  text,
  pickup_state    text,
  bank_name       text,
  bank_account_no text,
  bank_account_name text,
  status          merchant_status not null default 'pending_approval',
  fee_borne_by    fee_borne_by not null default 'merchant',
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on merchants (status);
create index on merchants (profile_id);

-- -----------------------------------------------------------------------------
-- RIDER APPLICATIONS  (from marketing site, pre-account)
-- -----------------------------------------------------------------------------
create table rider_applications (
  id            uuid primary key default uuid_generate_v4(),
  full_name     text not null,
  phone         text not null,
  city          text,
  state         text,
  vehicle       vehicle_type not null,
  has_licence   boolean not null default false,
  status        rider_status not null default 'applied',
  reviewed_by   uuid references profiles(id),
  reviewed_at   timestamptz,
  reject_reason text,
  created_at    timestamptz not null default now()
);
create index on rider_applications (status);

-- -----------------------------------------------------------------------------
-- RIDERS
-- -----------------------------------------------------------------------------
create table riders (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid not null references profiles(id) on delete restrict,
  application_id  uuid references rider_applications(id),
  vehicle         vehicle_type not null,
  city            text,
  state           text,
  has_licence     boolean not null default false,
  bank_name       text,
  bank_account_no text,
  bank_account_name text,
  status          rider_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on riders (status);
create index on riders (profile_id);

-- -----------------------------------------------------------------------------
-- WAREHOUSES
-- -----------------------------------------------------------------------------
create table warehouses (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  state       text not null,
  address     text,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- PRODUCTS & INVENTORY
-- -----------------------------------------------------------------------------
create table products (
  id            uuid primary key default uuid_generate_v4(),
  merchant_id   uuid not null references merchants(id) on delete restrict,
  sku           text,
  name          text not null,
  description   text,
  unit          text default 'unit',
  reorder_level int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (merchant_id, sku)
);
create index on products (merchant_id);

-- current stock per product per warehouse
create table inventory (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid not null references products(id) on delete restrict,
  warehouse_id  uuid not null references warehouses(id) on delete restrict,
  quantity      int not null default 0 check (quantity >= 0),
  updated_at    timestamptz not null default now(),
  unique (product_id, warehouse_id)
);
create index on inventory (product_id);

-- immutable log of stock movements (received / allocated / delivered / adjusted)
create table stock_movements (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid not null references products(id),
  warehouse_id  uuid not null references warehouses(id),
  change        int not null,                     -- +received, -allocated
  reason        text not null,                    -- 'received','allocated','delivered','adjustment'
  ref_type      text,                             -- e.g. 'order','manual'
  ref_id        uuid,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index on stock_movements (product_id);

-- -----------------------------------------------------------------------------
-- FEE RULES
-- -----------------------------------------------------------------------------
create table fee_rules (
  id                  uuid primary key default uuid_generate_v4(),
  scope               fee_rule_scope not null,
  merchant_id         uuid references merchants(id),   -- null when scope=global
  type                fee_rule_type not null,
  intrastate_fee_kobo bigint,                          -- for flat / intrastate default
  by_state            jsonb,                           -- { "Lagos":150000, "Kano":350000 } in kobo
  fallback_fee_kobo   bigint not null default 0,
  effective_from      timestamptz not null default now(),
  effective_to        timestamptz,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now()
);
create index on fee_rules (scope, merchant_id);

-- -----------------------------------------------------------------------------
-- ORDERS & ITEMS
-- -----------------------------------------------------------------------------
create table orders (
  id                uuid primary key default uuid_generate_v4(),
  merchant_id       uuid not null references merchants(id) on delete restrict,
  external_ref      text,                              -- future: source order id
  customer_name     text not null,
  customer_phone    text not null,
  delivery_address  text not null,
  delivery_state    text not null,
  delivery_area     text,
  order_value_kobo  bigint not null check (order_value_kobo >= 0),
  payment_type      payment_type not null,
  delivery_fee_kobo bigint not null default 0,         -- resolved at creation
  fee_borne_by      fee_borne_by not null,
  status            order_status not null default 'created',
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index on orders (merchant_id);
create index on orders (status);
create index on orders (delivery_state);

create table order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id),
  name_snapshot text not null,                         -- name at time of order
  quantity      int not null check (quantity > 0),
  unit_price_kobo bigint not null default 0
);
create index on order_items (order_id);

-- -----------------------------------------------------------------------------
-- DELIVERIES  (one per order in v1)
-- -----------------------------------------------------------------------------
create table deliveries (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid not null references orders(id) on delete restrict,
  rider_id          uuid references riders(id),
  status            delivery_status not null default 'assigned',
  payment_status    payment_status not null default 'unpaid',
  cash_collected    boolean not null default false,
  cash_amount_kobo  bigint,                            -- amount collected in COD
  assigned_by       uuid references profiles(id),
  assigned_at       timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (order_id)
);
create index on deliveries (rider_id);
create index on deliveries (status);
create index on deliveries (payment_status);

-- -----------------------------------------------------------------------------
-- VIRTUAL ACCOUNTS  (one-time / dedicated, from payment partner)
-- -----------------------------------------------------------------------------
create table virtual_accounts (
  id            uuid primary key default uuid_generate_v4(),
  purpose       text not null,                         -- 'delivery_payment' | 'cash_remittance'
  delivery_id   uuid references deliveries(id),
  remittance_id uuid,                                  -- fk added after cash_remittances
  provider      text not null,                         -- 'paystack' | 'flutterwave'
  account_no    text not null,
  bank_name     text,
  amount_kobo   bigint,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on virtual_accounts (delivery_id);

-- -----------------------------------------------------------------------------
-- PAYMENTS  (confirmed inflows)
-- -----------------------------------------------------------------------------
create table payments (
  id              uuid primary key default uuid_generate_v4(),
  delivery_id     uuid references deliveries(id),
  provider        text not null,
  provider_ref    text not null,
  amount_kobo     bigint not null,
  method          text not null,                       -- 'transfer' | 'cash_remittance'
  status          payment_status not null default 'paid',
  raw             jsonb,
  created_at      timestamptz not null default now(),
  unique (provider, provider_ref)
);

-- -----------------------------------------------------------------------------
-- CASH REMITTANCES  (COD)
-- -----------------------------------------------------------------------------
create table cash_remittances (
  id                uuid primary key default uuid_generate_v4(),
  rider_id          uuid not null references riders(id),
  delivery_id       uuid not null references deliveries(id),
  amount_owed_kobo  bigint not null,
  amount_remitted_kobo bigint not null default 0,
  status            remittance_status not null default 'pending',
  virtual_account_id uuid references virtual_accounts(id),
  reconciled_by     uuid references profiles(id),
  reconciled_at     timestamptz,
  created_at        timestamptz not null default now()
);
create index on cash_remittances (rider_id, status);
alter table virtual_accounts
  add constraint fk_va_remittance
  foreign key (remittance_id) references cash_remittances(id);

-- -----------------------------------------------------------------------------
-- LEDGER  (double-entry)
-- -----------------------------------------------------------------------------
-- One row per account; balance derived from entries (do not mutate directly).
create table ledger_accounts (
  id            uuid primary key default uuid_generate_v4(),
  type          ledger_account_type not null,
  owner_type    text,                                  -- 'merchant' | 'rider' | 'meld' | null
  owner_id      uuid,                                  -- merchant_id / rider_id / null
  created_at    timestamptz not null default now(),
  unique (type, owner_type, owner_id)
);

-- a transaction groups balanced entries
create table ledger_transactions (
  id            uuid primary key default uuid_generate_v4(),
  source_type   text not null,                         -- 'delivery' | 'withdrawal' | 'remittance' | 'adjustment'
  source_id     uuid,
  memo          text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- append-only; debit positive, credit positive in their own columns
create table ledger_entries (
  id              uuid primary key default uuid_generate_v4(),
  transaction_id  uuid not null references ledger_transactions(id) on delete restrict,
  account_id      uuid not null references ledger_accounts(id),
  debit_kobo      bigint not null default 0 check (debit_kobo  >= 0),
  credit_kobo     bigint not null default 0 check (credit_kobo >= 0),
  created_at      timestamptz not null default now(),
  check (debit_kobo = 0 or credit_kobo = 0)            -- an entry is either debit or credit
);
create index on ledger_entries (account_id);
create index on ledger_entries (transaction_id);

-- balance view
create view ledger_balances as
select a.id as account_id, a.type, a.owner_type, a.owner_id,
       coalesce(sum(e.credit_kobo),0) - coalesce(sum(e.debit_kobo),0) as balance_kobo
from ledger_accounts a
left join ledger_entries e on e.account_id = a.id
group by a.id;

-- balanced-posting guard: ensure each transaction's debits = credits
create or replace function assert_transaction_balanced(tx uuid)
returns void language plpgsql as $$
declare d bigint; c bigint;
begin
  select coalesce(sum(debit_kobo),0), coalesce(sum(credit_kobo),0)
    into d, c from ledger_entries where transaction_id = tx;
  if d <> c then
    raise exception 'Unbalanced ledger transaction %: debit % <> credit %', tx, d, c;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- WITHDRAWALS  (merchant settlements & rider payouts)
-- -----------------------------------------------------------------------------
create table withdrawals (
  id              uuid primary key default uuid_generate_v4(),
  owner_type      text not null,                        -- 'merchant' | 'rider'
  owner_id        uuid not null,
  amount_kobo     bigint not null check (amount_kobo > 0),
  status          withdrawal_status not null default 'requested',
  provider        text,
  provider_ref    text,
  bank_account_no text,
  bank_name       text,
  failure_reason  text,
  created_at      timestamptz not null default now(),
  processed_at    timestamptz
);
create index on withdrawals (owner_type, owner_id, status);

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS
-- -----------------------------------------------------------------------------
create table notifications (
  id            uuid primary key default uuid_generate_v4(),
  recipient_id  uuid references profiles(id),          -- null for customer (external)
  recipient_phone text,                                -- for customer SMS
  event         text not null,
  title         text,
  body          text,
  channels      notification_channel[] not null default '{in_app}',
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index on notifications (recipient_id, read_at);

-- -----------------------------------------------------------------------------
-- WEBHOOK IDEMPOTENCY
-- -----------------------------------------------------------------------------
create table processed_events (
  id            uuid primary key default uuid_generate_v4(),
  provider      text not null,
  event_id      text not null,
  processed_at  timestamptz not null default now(),
  unique (provider, event_id)
);

-- -----------------------------------------------------------------------------
-- DEMO REQUESTS  (marketing)
-- -----------------------------------------------------------------------------
create table demo_requests (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  business_name text,
  email         text not null,
  phone         text,
  message       text,
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- AUDIT LOG
-- -----------------------------------------------------------------------------
create table audit_log (
  id            uuid primary key default uuid_generate_v4(),
  actor_id      uuid references profiles(id),
  action        text not null,                          -- 'approve_merchant','change_fee',...
  entity_type   text,
  entity_id     uuid,
  detail        jsonb,
  created_at    timestamptz not null default now()
);
create index on audit_log (entity_type, entity_id);

-- =============================================================================
-- CORE FUNCTION: post a balanced ledger transaction
-- entries: jsonb array of { account_id, debit_kobo, credit_kobo }
-- =============================================================================
create or replace function post_ledger_transaction(
  p_source_type text,
  p_source_id   uuid,
  p_memo        text,
  p_entries     jsonb,
  p_created_by  uuid default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_tx uuid;
  v_entry jsonb;
begin
  insert into ledger_transactions(source_type, source_id, memo, created_by)
  values (p_source_type, p_source_id, p_memo, p_created_by)
  returning id into v_tx;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    insert into ledger_entries(transaction_id, account_id, debit_kobo, credit_kobo)
    values (
      v_tx,
      (v_entry->>'account_id')::uuid,
      coalesce((v_entry->>'debit_kobo')::bigint, 0),
      coalesce((v_entry->>'credit_kobo')::bigint, 0)
    );
  end loop;

  perform assert_transaction_balanced(v_tx);   -- raises if unbalanced
  return v_tx;
end $$;

-- =============================================================================
-- RLS  (enable + representative policies; complete in migrations)
-- =============================================================================
alter table profiles            enable row level security;
alter table merchants           enable row level security;
alter table riders              enable row level security;
alter table products            enable row level security;
alter table inventory           enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table deliveries          enable row level security;
alter table ledger_entries      enable row level security;
alter table withdrawals         enable row level security;
alter table cash_remittances    enable row level security;
alter table rider_applications  enable row level security;
alter table demo_requests       enable row level security;
alter table notifications       enable row level security;

-- helper: current user's role
create or replace function current_role_is(p_role user_role)
returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = p_role);
$$;

create or replace function current_is_ops()
returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('ops_agent','ops_admin'));
$$;

-- marketing: anyone (anon) may insert applications & demo requests
create policy anon_insert_rider_app on rider_applications
  for insert to anon with check (true);
create policy anon_insert_demo on demo_requests
  for insert to anon with check (true);

-- merchant sees own merchant row
create policy merchant_self on merchants
  for select using (
    profile_id = auth.uid() or current_is_ops()
  );

-- merchant orders: own rows; ops sees all
create policy merchant_orders_select on orders
  for select using (
    current_is_ops()
    or merchant_id in (select id from merchants where profile_id = auth.uid())
  );
create policy merchant_orders_insert on orders
  for insert with check (
    merchant_id in (select id from merchants where profile_id = auth.uid()
                    and status = 'approved')
  );

-- rider deliveries: own assigned; ops sees all
create policy rider_deliveries_select on deliveries
  for select using (
    current_is_ops()
    or rider_id in (select id from riders where profile_id = auth.uid())
  );

-- ledger entries: ops all; owners via their accounts
create policy ledger_read on ledger_entries
  for select using (
    current_is_ops()
    or account_id in (
      select la.id from ledger_accounts la
      where (la.owner_type = 'merchant' and la.owner_id in
              (select id from merchants where profile_id = auth.uid()))
         or (la.owner_type = 'rider' and la.owner_id in
              (select id from riders where profile_id = auth.uid()))
    )
  );

-- notifications: own only
create policy notif_own on notifications
  for select using (recipient_id = auth.uid() or current_is_ops());

-- NOTE: write policies for ops actions, inventory, fee_rules, etc. are added in
-- migrations. Ledger writes occur only via post_ledger_transaction (security definer)
-- or Edge Functions using the service role — never direct client writes.

-- =============================================================================
-- SEED: canonical ledger accounts for MELD-wide balances
-- =============================================================================
insert into ledger_accounts (type, owner_type, owner_id) values
  ('meld_revenue','meld', null),
  ('partner_float','meld', null),
  ('suspense','meld', null)
on conflict do nothing;

-- Per-merchant 'merchant_payable' and per-rider 'rider_wallet' / 'cash_in_transit'
-- accounts are created on merchant approval / rider activation (in app logic).
