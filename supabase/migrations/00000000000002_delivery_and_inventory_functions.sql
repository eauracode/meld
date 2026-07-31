-- =============================================================================
-- MELD — Core business functions (Phase 6)
-- =============================================================================
-- Every function here is SECURITY DEFINER: it runs with the elevated
-- privilege needed to read/write tables that RLS otherwise locks down for
-- the calling client role, but each function independently re-checks the
-- caller's identity/role before touching anything — the function body IS
-- the access-control boundary, not the RLS policies it bypasses.
--
-- Golden rule preserved: none of these compute money splits or delivery
-- fees. That logic lives only in packages/ledger and packages/fees; where a
-- function moves money it does so by calling post_ledger_transaction with
-- entries the CALLER (an Edge Function using @meld/ledger) already computed
-- in TypeScript, or — for complete_delivery — moves no money at all, because
-- prepaid/COD money already posted earlier at payment-confirmed /
-- cash-collected time (01_SHARED_FOUNDATIONS §4).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DISPATCH
-- -----------------------------------------------------------------------------
create or replace function assign_rider(p_order_id uuid, p_rider_id uuid)
returns uuid
language plpgsql security definer
as $$
declare
  v_rider_status rider_status;
  v_order_status order_status;
  v_delivery_id  uuid;
begin
  if not current_is_ops() then
    raise exception 'Only Ops can assign riders';
  end if;

  select status into v_rider_status from riders where id = p_rider_id;
  if v_rider_status is distinct from 'active' then
    raise exception 'Rider must be active to receive assignments';
  end if;

  select status into v_order_status from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;
  if v_order_status is distinct from 'awaiting_assignment' then
    raise exception 'Order must be awaiting_assignment, got %', v_order_status;
  end if;

  insert into deliveries (order_id, rider_id, status, assigned_by, assigned_at)
  values (p_order_id, p_rider_id, 'assigned', auth.uid(), now())
  returning id into v_delivery_id;

  update orders set status = 'assigned', updated_at = now() where id = p_order_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
  values (auth.uid(), 'assign_rider', 'delivery', v_delivery_id,
          jsonb_build_object('order_id', p_order_id, 'rider_id', p_rider_id));

  return v_delivery_id;
end $$;

-- -----------------------------------------------------------------------------
-- DELIVERY LIFECYCLE  (assigned → accepted → en_route → arrived → delivered/failed)
-- No client UPDATE policy exists on `deliveries` — every transition below is
-- the only legitimate path, each re-validating caller + current status.
-- -----------------------------------------------------------------------------
create or replace function accept_delivery(p_delivery_id uuid)
returns void
language plpgsql security definer
as $$
declare v_rider_id uuid; v_status delivery_status;
begin
  select rider_id, status into v_rider_id, v_status from deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery % not found', p_delivery_id; end if;
  if not (current_is_ops() or v_rider_id = current_rider_id()) then
    raise exception 'Not authorized for this delivery';
  end if;
  if v_status <> 'assigned' then
    raise exception 'Cannot accept a delivery in status %', v_status;
  end if;
  update deliveries set status = 'accepted', updated_at = now() where id = p_delivery_id;
end $$;

create or replace function start_en_route(p_delivery_id uuid)
returns void
language plpgsql security definer
as $$
declare v_rider_id uuid; v_status delivery_status;
begin
  select rider_id, status into v_rider_id, v_status from deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery % not found', p_delivery_id; end if;
  if not (current_is_ops() or v_rider_id = current_rider_id()) then
    raise exception 'Not authorized for this delivery';
  end if;
  if v_status <> 'accepted' then
    raise exception 'Cannot start en route from status %', v_status;
  end if;
  update deliveries set status = 'en_route', updated_at = now() where id = p_delivery_id;
end $$;

create or replace function mark_arrived(p_delivery_id uuid)
returns void
language plpgsql security definer
as $$
declare v_rider_id uuid; v_status delivery_status;
begin
  select rider_id, status into v_rider_id, v_status from deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery % not found', p_delivery_id; end if;
  if not (current_is_ops() or v_rider_id = current_rider_id()) then
    raise exception 'Not authorized for this delivery';
  end if;
  if v_status <> 'en_route' then
    raise exception 'Cannot mark arrived from status %', v_status;
  end if;
  update deliveries set status = 'arrived', updated_at = now() where id = p_delivery_id;
end $$;

create or replace function fail_delivery(p_delivery_id uuid, p_reason text)
returns void
language plpgsql security definer
as $$
declare v_rider_id uuid; v_status delivery_status; v_order_id uuid;
begin
  select rider_id, status, order_id into v_rider_id, v_status, v_order_id
    from deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery % not found', p_delivery_id; end if;
  if not (current_is_ops() or v_rider_id = current_rider_id()) then
    raise exception 'Not authorized for this delivery';
  end if;
  if v_status in ('delivered', 'failed') then
    raise exception 'Cannot fail a delivery already in status %', v_status;
  end if;
  update deliveries set status = 'failed', updated_at = now() where id = p_delivery_id;
  update orders set status = 'failed', updated_at = now() where id = v_order_id;
  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (auth.uid(), 'fail_delivery', 'delivery', p_delivery_id, jsonb_build_object('reason', p_reason));
end $$;

-- -----------------------------------------------------------------------------
-- complete_delivery — THE PAYMENT GATE (04_PRD_Rider §3.2, 08_APP_FLOWS §4)
-- "Delivered" is allowed only if payment_status = 'paid' OR cash_collected =
-- true. This is the server-side half of the gate proven in Phase 4 — no
-- client update policy on `deliveries` exists, so this function is the ONLY
-- way a delivery can reach 'delivered', and it re-derives the gate from the
-- row itself, never trusting anything the caller claims.
-- -----------------------------------------------------------------------------
create or replace function complete_delivery(p_delivery_id uuid)
returns void
language plpgsql security definer
as $$
declare v_delivery deliveries%rowtype;
begin
  select * into v_delivery from deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery % not found', p_delivery_id; end if;
  if not (current_is_ops() or v_delivery.rider_id = current_rider_id()) then
    raise exception 'Not authorized for this delivery';
  end if;
  if v_delivery.status = 'delivered' then
    return; -- idempotent — repeated calls are a no-op, not an error
  end if;
  if v_delivery.status <> 'arrived' then
    raise exception 'Cannot complete a delivery in status %', v_delivery.status;
  end if;
  if not (v_delivery.payment_status = 'paid' or v_delivery.cash_collected) then
    raise exception 'Payment not accounted for — cannot complete delivery';
  end if;

  update deliveries set status = 'delivered', completed_at = now(), updated_at = now()
    where id = p_delivery_id;
  update orders set status = 'delivered', updated_at = now() where id = v_delivery.order_id;
end $$;

-- -----------------------------------------------------------------------------
-- ORDER CREATION — atomic: validates the merchant is approved, checks and
-- allocates stock, inserts the order + items in one transaction. The
-- delivery fee is a parameter (resolved by the caller via packages/fees) —
-- never recomputed here.
-- -----------------------------------------------------------------------------
create or replace function allocate_stock(p_product_id uuid, p_quantity int, p_order_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_remaining int := p_quantity;
  v_row record;
  v_take int;
begin
  for v_row in
    select id, warehouse_id, quantity from inventory
    where product_id = p_product_id and quantity > 0
    order by updated_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_row.quantity, v_remaining);
    update inventory set quantity = quantity - v_take, updated_at = now() where id = v_row.id;
    insert into stock_movements (product_id, warehouse_id, change, reason, ref_type, ref_id, created_by)
      values (p_product_id, v_row.warehouse_id, -v_take, 'allocated', 'order', p_order_id, auth.uid());
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'Not enough stock for product % (short by %)', p_product_id, v_remaining;
  end if;
end $$;

create or replace function create_order(
  p_customer_name    text,
  p_customer_phone   text,
  p_delivery_address text,
  p_delivery_state   text,
  p_delivery_area    text,
  p_order_value_kobo bigint,
  p_payment_type     payment_type,
  p_delivery_fee_kobo bigint,
  p_fee_borne_by     fee_borne_by,
  p_items            jsonb  -- [{ "product_id": uuid, "quantity": int }, ...]
) returns uuid
language plpgsql security definer
as $$
declare
  v_merchant_id   uuid;
  v_order_id      uuid;
  v_item          jsonb;
  v_product_id    uuid;
  v_quantity      int;
  v_product_name  text;
begin
  v_merchant_id := current_merchant_id();
  if v_merchant_id is null then
    raise exception 'Only a merchant can create orders';
  end if;
  if not exists (select 1 from merchants where id = v_merchant_id and status = 'approved') then
    raise exception 'Merchant is not approved — cannot create live orders';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'An order needs at least one item';
  end if;

  insert into orders (
    merchant_id, customer_name, customer_phone, delivery_address, delivery_state,
    delivery_area, order_value_kobo, payment_type, delivery_fee_kobo, fee_borne_by,
    status, created_by
  ) values (
    v_merchant_id, p_customer_name, p_customer_phone, p_delivery_address, p_delivery_state,
    p_delivery_area, p_order_value_kobo, p_payment_type, p_delivery_fee_kobo, p_fee_borne_by,
    'awaiting_assignment', auth.uid()
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Item quantity must be a positive integer';
    end if;

    select name into v_product_name from products
      where id = v_product_id and merchant_id = v_merchant_id;
    if v_product_name is null then
      raise exception 'Product % does not belong to this merchant', v_product_id;
    end if;

    insert into order_items (order_id, product_id, name_snapshot, quantity, unit_price_kobo)
      values (v_order_id, v_product_id, v_product_name, v_quantity, 0);

    perform allocate_stock(v_product_id, v_quantity, v_order_id);
  end loop;

  return v_order_id;
end $$;

-- -----------------------------------------------------------------------------
-- INVENTORY  (Ops-only — receiving and correction, both audited)
-- -----------------------------------------------------------------------------
create or replace function receive_inventory(p_product_id uuid, p_warehouse_id uuid, p_quantity int)
returns void
language plpgsql security definer
as $$
begin
  if not current_is_ops() then raise exception 'Only Ops can receive inventory'; end if;
  if p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;

  insert into inventory (product_id, warehouse_id, quantity)
    values (p_product_id, p_warehouse_id, p_quantity)
  on conflict (product_id, warehouse_id)
    do update set quantity = inventory.quantity + excluded.quantity, updated_at = now();

  insert into stock_movements (product_id, warehouse_id, change, reason, ref_type, created_by)
    values (p_product_id, p_warehouse_id, p_quantity, 'received', 'manual', auth.uid());

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (auth.uid(), 'receive_inventory', 'product', p_product_id,
            jsonb_build_object('warehouse_id', p_warehouse_id, 'quantity', p_quantity));
end $$;

create or replace function adjust_stock(p_product_id uuid, p_warehouse_id uuid, p_change int, p_reason text)
returns void
language plpgsql security definer
as $$
declare v_current int;
begin
  if not current_is_ops() then raise exception 'Only Ops can adjust stock'; end if;
  if p_change = 0 then raise exception 'Change must be non-zero'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'A reason is required'; end if;

  select quantity into v_current from inventory
    where product_id = p_product_id and warehouse_id = p_warehouse_id for update;
  if not found or v_current + p_change < 0 then
    raise exception 'Adjustment would make stock negative';
  end if;

  update inventory set quantity = quantity + p_change, updated_at = now()
    where product_id = p_product_id and warehouse_id = p_warehouse_id;

  insert into stock_movements (product_id, warehouse_id, change, reason, ref_type, created_by)
    values (p_product_id, p_warehouse_id, p_change, 'adjustment: ' || p_reason, 'manual', auth.uid());

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (auth.uid(), 'adjust_stock', 'product', p_product_id,
            jsonb_build_object('warehouse_id', p_warehouse_id, 'change', p_change, 'reason', p_reason));
end $$;

-- -----------------------------------------------------------------------------
-- APPROVALS  (05_PRD_Ops §2.1)
-- Rider APPLICATION approval is deliberately NOT here — creating the rider's
-- login requires the Supabase Auth Admin API (invite email), which only an
-- Edge Function can call. Rejection needs no auth user, so it stays SQL.
-- -----------------------------------------------------------------------------
create or replace function approve_merchant(
  p_merchant_id uuid,
  p_fee_borne_by fee_borne_by,
  p_override_flat_fee_kobo bigint default null
) returns void
language plpgsql security definer
as $$
declare v_business_name text;
begin
  if not current_is_ops() then raise exception 'Only Ops can approve merchants'; end if;

  update merchants
    set status = 'approved', fee_borne_by = p_fee_borne_by,
        approved_by = auth.uid(), approved_at = now(), updated_at = now()
    where id = p_merchant_id and status = 'pending_approval'
    returning business_name into v_business_name;
  if v_business_name is null then
    raise exception 'Merchant % not found or not pending approval', p_merchant_id;
  end if;

  insert into ledger_accounts (type, owner_type, owner_id)
    values ('merchant_payable', 'merchant', p_merchant_id)
    on conflict do nothing;

  if p_override_flat_fee_kobo is not null then
    insert into fee_rules (scope, merchant_id, type, intrastate_fee_kobo, fallback_fee_kobo, created_by)
      values ('merchant', p_merchant_id, 'flat', p_override_flat_fee_kobo, p_override_flat_fee_kobo, auth.uid());
  end if;

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (auth.uid(), 'approve_merchant', 'merchant', p_merchant_id,
            jsonb_build_object('fee_borne_by', p_fee_borne_by, 'override_fee_kobo', p_override_flat_fee_kobo));
end $$;

create or replace function set_merchant_status(p_merchant_id uuid, p_status merchant_status)
returns void
language plpgsql security definer
as $$
begin
  if not current_is_ops() then raise exception 'Only Ops can change merchant status'; end if;
  update merchants set status = p_status, updated_at = now() where id = p_merchant_id;
  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (auth.uid(), 'set_merchant_status', 'merchant', p_merchant_id, jsonb_build_object('status', p_status));
end $$;

create or replace function set_rider_status(p_rider_id uuid, p_status rider_status)
returns void
language plpgsql security definer
as $$
begin
  if not current_is_ops() then raise exception 'Only Ops can change rider status'; end if;
  update riders set status = p_status, updated_at = now() where id = p_rider_id;
  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (auth.uid(), 'set_rider_status', 'rider', p_rider_id, jsonb_build_object('status', p_status));
end $$;

create or replace function reject_rider_application(p_application_id uuid, p_reason text)
returns void
language plpgsql security definer
as $$
begin
  if not current_is_ops() then raise exception 'Only Ops can review applications'; end if;
  update rider_applications
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), reject_reason = p_reason
    where id = p_application_id and status = 'applied';
  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (auth.uid(), 'reject_rider', 'rider_application', p_application_id, jsonb_build_object('reason', p_reason));
end $$;

-- -----------------------------------------------------------------------------
-- SELF-SERVICE PROFILE UPDATES — safe columns only; status/approval/fee
-- fields are deliberately excluded so a merchant/rider can never self-approve
-- or change their own fee terms by editing "their own row".
-- -----------------------------------------------------------------------------
create or replace function update_merchant_profile(
  p_business_name text, p_contact_person text, p_phone text, p_email text,
  p_pickup_address text, p_pickup_state text,
  p_bank_name text, p_bank_account_no text, p_bank_account_name text
) returns void
language plpgsql security definer
as $$
declare v_id uuid;
begin
  v_id := current_merchant_id();
  if v_id is null then raise exception 'No merchant profile for the current user'; end if;
  update merchants set
    business_name = p_business_name, contact_person = p_contact_person,
    phone = p_phone, email = p_email,
    pickup_address = p_pickup_address, pickup_state = p_pickup_state,
    bank_name = p_bank_name, bank_account_no = p_bank_account_no, bank_account_name = p_bank_account_name,
    updated_at = now()
  where id = v_id;
end $$;

create or replace function update_rider_profile(
  p_city text, p_state text, p_vehicle vehicle_type, p_has_licence boolean,
  p_bank_name text, p_bank_account_no text, p_bank_account_name text
) returns void
language plpgsql security definer
as $$
declare v_id uuid;
begin
  v_id := current_rider_id();
  if v_id is null then raise exception 'No rider profile for the current user'; end if;
  update riders set
    city = p_city, state = p_state, vehicle = p_vehicle, has_licence = p_has_licence,
    bank_name = p_bank_name, bank_account_no = p_bank_account_no, bank_account_name = p_bank_account_name,
    updated_at = now()
  where id = v_id;
end $$;

-- -----------------------------------------------------------------------------
-- MANUAL LEDGER ADJUSTMENT — ops_admin only, reason required, always audited
-- (05_PRD_Ops FR-3: same balance rule as automatic postings, via
-- post_ledger_transaction — never a hand-rolled insert).
-- -----------------------------------------------------------------------------
create or replace function manual_ledger_adjustment(
  p_debit_account_id uuid, p_credit_account_id uuid, p_amount_kobo bigint, p_reason text
) returns uuid
language plpgsql security definer
as $$
declare v_tx uuid;
begin
  if not current_role_is('ops_admin') then
    raise exception 'Only ops_admin can post manual ledger adjustments';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required for manual adjustments';
  end if;
  if p_debit_account_id = p_credit_account_id then
    raise exception 'Debit and credit accounts must differ';
  end if;

  v_tx := post_ledger_transaction(
    'adjustment', null, 'Manual adjustment: ' || p_reason,
    jsonb_build_array(
      jsonb_build_object('account_id', p_debit_account_id, 'debit_kobo', p_amount_kobo),
      jsonb_build_object('account_id', p_credit_account_id, 'credit_kobo', p_amount_kobo)
    ),
    auth.uid()
  );

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (auth.uid(), 'manual_adjustment', 'ledger_transaction', v_tx,
            jsonb_build_object('amount_kobo', p_amount_kobo, 'reason', p_reason));
  return v_tx;
end $$;
