-- =============================================================================
-- MELD — Row-Level Security policies (Phase 6, 10_IMPLEMENTATION_PLAN)
-- =============================================================================
-- Deny-by-default: every business table has RLS enabled; a table with RLS
-- enabled and NO matching policy denies all access to anon/authenticated —
-- only service_role (used by Edge Functions/server code) bypasses RLS.
--
-- Design rule this migration enforces strictly: no client role gets a direct
-- UPDATE policy on `deliveries`. Every status transition — including the
-- "delivered" payment gate — goes through a SECURITY DEFINER function in
-- 00000000000002_delivery_and_inventory_functions.sql. A raw
-- `update deliveries set status = 'delivered'` from a client must be
-- impossible, not just discouraged (04_PRD_Rider §3.2, proven in Phase 4).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on every remaining business table
-- -----------------------------------------------------------------------------
alter table warehouses         enable row level security;
alter table stock_movements    enable row level security;
alter table fee_rules          enable row level security;
alter table virtual_accounts   enable row level security;
alter table payments           enable row level security;
alter table ledger_accounts    enable row level security;
alter table ledger_transactions enable row level security;
alter table audit_log          enable row level security;
alter table processed_events   enable row level security;
-- (profiles, merchants, riders, products, inventory, orders, order_items,
--  deliveries, ledger_entries, withdrawals, cash_remittances,
--  rider_applications, demo_requests, notifications already enabled in
--  00000000000000_init.sql)

-- -----------------------------------------------------------------------------
-- Helper: the current user's merchant / rider row id (null if neither)
-- -----------------------------------------------------------------------------
create or replace function current_merchant_id()
returns uuid language sql stable as $$
  select id from merchants where profile_id = auth.uid();
$$;

create or replace function current_rider_id()
returns uuid language sql stable as $$
  select id from riders where profile_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- PROFILES — read/update own row; ops reads all (staff directory, approvals)
-- -----------------------------------------------------------------------------
create policy profiles_self_select on profiles
  for select to authenticated using (id = auth.uid() or current_is_ops());
create policy profiles_self_update on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- MERCHANTS — self sign-up inserts own row; ops approves/suspends via function
-- -----------------------------------------------------------------------------
create policy merchants_self_insert on merchants
  for insert to authenticated with check (profile_id = auth.uid());
-- Ops gets a blanket read/write grant here (internal staff, not an
-- adversarial client role) for administrative corrections; the SENSITIVE
-- transitions — approval, suspension, fee terms — are additionally exposed
-- as approve_merchant()/set_merchant_status(), which audit_log every call.
-- Merchants edit their own safe fields via update_merchant_profile().
create policy merchants_ops_all on merchants
  for all to authenticated using (current_is_ops()) with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- RIDERS — self row read; writes only via functions (see merchants rationale)
-- -----------------------------------------------------------------------------
create policy riders_self_select on riders
  for select to authenticated using (profile_id = auth.uid() or current_is_ops());
-- Same tradeoff as merchants_ops_all above — sensitive transitions go
-- through set_rider_status(), which is audited.
create policy riders_ops_all on riders
  for all to authenticated using (current_is_ops()) with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- RIDER APPLICATIONS — ops reviews (anon insert policy already exists)
-- -----------------------------------------------------------------------------
create policy rider_applications_ops_select on rider_applications
  for select to authenticated using (current_is_ops());
create policy rider_applications_ops_update on rider_applications
  for update to authenticated using (current_is_ops()) with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- DEMO REQUESTS — ops can read leads (anon insert policy already exists)
-- -----------------------------------------------------------------------------
create policy demo_requests_ops_select on demo_requests
  for select to authenticated using (current_is_ops());

-- -----------------------------------------------------------------------------
-- WAREHOUSES — every logged-in role reads (names shown in inventory views);
-- only ops registers/edits them.
-- -----------------------------------------------------------------------------
create policy warehouses_select on warehouses
  for select to authenticated using (true);
create policy warehouses_ops_write on warehouses
  for insert to authenticated with check (current_is_ops());
create policy warehouses_ops_update on warehouses
  for update to authenticated using (current_is_ops()) with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- PRODUCTS — merchant owns their catalogue; ops has broad access
-- -----------------------------------------------------------------------------
create policy products_select on products
  for select to authenticated using (merchant_id = current_merchant_id() or current_is_ops());
create policy products_merchant_insert on products
  for insert to authenticated with check (
    merchant_id = current_merchant_id()
    and exists (select 1 from merchants where id = merchant_id and status = 'approved')
  );
create policy products_merchant_update on products
  for update to authenticated
  using (merchant_id = current_merchant_id() or current_is_ops())
  with check (merchant_id = current_merchant_id() or current_is_ops());

-- -----------------------------------------------------------------------------
-- INVENTORY — merchant reads own stock; only Ops writes (receive/adjust
-- funnel through receive_inventory()/adjust_stock(), which are
-- SECURITY DEFINER and so unaffected by the absence of a merchant write
-- policy here — merchants simply have no path to inventory writes at all).
-- -----------------------------------------------------------------------------
create policy inventory_select on inventory
  for select to authenticated using (
    current_is_ops()
    or product_id in (select id from products where merchant_id = current_merchant_id())
  );
create policy inventory_ops_write on inventory
  for all to authenticated using (current_is_ops()) with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- STOCK MOVEMENTS — merchant reads own history; ops reads/writes all
-- -----------------------------------------------------------------------------
create policy stock_movements_select on stock_movements
  for select to authenticated using (
    current_is_ops()
    or product_id in (select id from products where merchant_id = current_merchant_id())
  );
create policy stock_movements_ops_insert on stock_movements
  for insert to authenticated with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- FEE RULES — Ops only, end to end. Merchants never read this table directly;
-- resolved fees reach them only as the delivery_fee_kobo already stored on
-- their own orders (fee logic stays inside packages/fees, never duplicated
-- in SQL — 01_SHARED_FOUNDATIONS "golden rule").
-- -----------------------------------------------------------------------------
create policy fee_rules_ops_select on fee_rules
  for select to authenticated using (current_is_ops());
create policy fee_rules_ops_admin_write on fee_rules
  for insert to authenticated with check (current_role_is('ops_admin'));

-- -----------------------------------------------------------------------------
-- ORDERS — merchant owns; rider reads orders behind their assigned deliveries
-- -----------------------------------------------------------------------------
-- (merchant_orders_select / merchant_orders_insert already exist)
create policy orders_rider_select on orders
  for select to authenticated using (
    id in (select order_id from deliveries where rider_id = current_rider_id())
  );
-- Orders are never deleted and rarely updated directly by clients — status
-- transitions ride along with assign_rider()/complete_delivery(); a merchant
-- may still cancel their own order before dispatch.
create policy orders_merchant_cancel on orders
  for update to authenticated
  using (merchant_id = current_merchant_id() and status = 'created')
  with check (merchant_id = current_merchant_id() and status in ('created', 'cancelled'));
create policy orders_ops_all on orders
  for all to authenticated using (current_is_ops()) with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- ORDER ITEMS — follow the parent order's visibility
-- -----------------------------------------------------------------------------
create policy order_items_select on order_items
  for select to authenticated using (
    order_id in (
      select id from orders
      where merchant_id = current_merchant_id()
         or id in (select order_id from deliveries where rider_id = current_rider_id())
    )
    or current_is_ops()
  );
create policy order_items_merchant_insert on order_items
  for insert to authenticated with check (
    order_id in (select id from orders where merchant_id = current_merchant_id())
  );

-- -----------------------------------------------------------------------------
-- DELIVERIES — read only for clients (rider own, merchant via order, ops all).
-- Deliberately NO client UPDATE policy — see file header.
-- -----------------------------------------------------------------------------
-- (rider_deliveries_select already exists — own assigned + ops)
create policy deliveries_merchant_select on deliveries
  for select to authenticated using (
    order_id in (select id from orders where merchant_id = current_merchant_id())
  );

-- -----------------------------------------------------------------------------
-- VIRTUAL ACCOUNTS — rider/merchant see the ones tied to their own deliveries
-- or remittances; created only by Edge Functions (service_role, bypasses RLS).
-- -----------------------------------------------------------------------------
create policy virtual_accounts_select on virtual_accounts
  for select to authenticated using (
    current_is_ops()
    or delivery_id in (
      select id from deliveries
      where rider_id = current_rider_id()
         or order_id in (select id from orders where merchant_id = current_merchant_id())
    )
    or remittance_id in (select id from cash_remittances where rider_id = current_rider_id())
  );

-- -----------------------------------------------------------------------------
-- PAYMENTS — read-only reflection of confirmed inflows; written only by the
-- payment webhook (service_role).
-- -----------------------------------------------------------------------------
create policy payments_select on payments
  for select to authenticated using (
    current_is_ops()
    or delivery_id in (
      select id from deliveries
      where rider_id = current_rider_id()
         or order_id in (select id from orders where merchant_id = current_merchant_id())
    )
  );

-- -----------------------------------------------------------------------------
-- CASH REMITTANCES — rider owns; ops reconciles
-- -----------------------------------------------------------------------------
create policy cash_remittances_rider_select on cash_remittances
  for select to authenticated using (rider_id = current_rider_id() or current_is_ops());
create policy cash_remittances_ops_write on cash_remittances
  for update to authenticated using (current_is_ops()) with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- WITHDRAWALS — owner requests their own; ops sees/processes all
-- -----------------------------------------------------------------------------
create policy withdrawals_owner_select on withdrawals
  for select to authenticated using (
    current_is_ops()
    or (owner_type = 'merchant' and owner_id = current_merchant_id())
    or (owner_type = 'rider' and owner_id = current_rider_id())
  );
create policy withdrawals_owner_insert on withdrawals
  for insert to authenticated with check (
    status = 'requested'
    and (
      (owner_type = 'merchant' and owner_id = current_merchant_id())
      or (owner_type = 'rider' and owner_id = current_rider_id())
    )
  );
create policy withdrawals_ops_update on withdrawals
  for update to authenticated using (current_is_ops()) with check (current_is_ops());

-- -----------------------------------------------------------------------------
-- LEDGER ACCOUNTS / TRANSACTIONS — same visibility rule as ledger_entries;
-- never client-writable (post_ledger_transaction is the only writer, and it's
-- SECURITY DEFINER, so it bypasses these policies regardless).
-- -----------------------------------------------------------------------------
create policy ledger_accounts_select on ledger_accounts
  for select to authenticated using (
    current_is_ops()
    or (owner_type = 'merchant' and owner_id = current_merchant_id())
    or (owner_type = 'rider' and owner_id = current_rider_id())
  );
create policy ledger_transactions_select on ledger_transactions
  for select to authenticated using (
    current_is_ops()
    or id in (
      select transaction_id from ledger_entries where account_id in (
        select id from ledger_accounts
        where (owner_type = 'merchant' and owner_id = current_merchant_id())
           or (owner_type = 'rider' and owner_id = current_rider_id())
      )
    )
  );

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS — own only; "mark read" is the one client write allowed
-- -----------------------------------------------------------------------------
create policy notifications_own_update on notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- -----------------------------------------------------------------------------
-- AUDIT LOG — ops reads; written only by SECURITY DEFINER functions/service role
-- -----------------------------------------------------------------------------
create policy audit_log_ops_select on audit_log
  for select to authenticated using (current_is_ops());

-- processed_events: no policies at all — only service_role (webhook handler)
-- ever touches it; RLS-enabled with zero policies denies every client role.
