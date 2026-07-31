-- =============================================================================
-- MELD — bank_code columns (Phase 6)
-- =============================================================================
-- Paystack/Flutterwave transfer APIs require the NIBSS bank code, not the
-- bank name — a gap in the original schema (07_DATABASE_SCHEMA.sql only
-- stored bank_name/bank_account_no/bank_account_name). Additive, non-
-- breaking; self-service setters kept separate from update_merchant_profile/
-- update_rider_profile so those functions' signatures never had to change.
-- =============================================================================

alter table merchants add column if not exists bank_code text;
alter table riders    add column if not exists bank_code text;

create or replace function set_merchant_bank_code(p_bank_code text)
returns void
language plpgsql security definer
as $$
declare v_id uuid;
begin
  v_id := current_merchant_id();
  if v_id is null then raise exception 'No merchant profile for the current user'; end if;
  update merchants set bank_code = p_bank_code, updated_at = now() where id = v_id;
end $$;

create or replace function set_rider_bank_code(p_bank_code text)
returns void
language plpgsql security definer
as $$
declare v_id uuid;
begin
  v_id := current_rider_id();
  if v_id is null then raise exception 'No rider profile for the current user'; end if;
  update riders set bank_code = p_bank_code, updated_at = now() where id = v_id;
end $$;
