-- 012: RPC functions
create or replace function public.bootstrap_admin(admin_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  super_role uuid;
begin
  select id into super_role from public.roles where code = 'super_admin';
  update public.profiles
  set user_type = 'staff', is_active = true, full_name = coalesce(full_name, 'Super Admin')
  where id = admin_user_id;
  insert into public.user_roles (user_id, role_id)
  values (admin_user_id, super_role)
  on conflict do nothing;
end;
$$;

create or replace function public.approve_membership_application(application_id uuid, reviewer_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.membership_applications%rowtype;
  new_member_id uuid;
  code text;
begin
  if not public.is_staff() then
    raise exception 'Unauthorized';
  end if;

  select * into app from public.membership_applications where id = application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if app.status = 'approved' then
    select id into new_member_id from public.members
    where user_id = app.applicant_user_id limit 1;
    return jsonb_build_object('member_id', new_member_id, 'idempotent', true);
  end if;
  if app.status <> 'pending' then raise exception 'Application is not pending'; end if;

  code := public.next_member_code();
  insert into public.members (member_code, full_name, email, contact_number, membership_type, status, date_of_membership, user_id)
  values (code, app.full_name, app.email, app.contact_number, app.membership_type, 'active', current_date, app.applicant_user_id)
  returning id into new_member_id;

  update public.membership_applications
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = application_id;

  if app.applicant_user_id is not null then
    update public.profiles
    set user_type = 'member', is_active = true, member_id = new_member_id
    where id = app.applicant_user_id;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'approve_membership_application', 'membership_applications', application_id, jsonb_build_object('member_id', new_member_id, 'notes', reviewer_notes));

  return jsonb_build_object('member_id', new_member_id, 'member_code', code);
end;
$$;

create or replace function public.post_journal_entry(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_id uuid;
  total_debit numeric(18, 2) := 0;
  total_credit numeric(18, 2) := 0;
  line jsonb;
  cash_account uuid;
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;

  select id into cash_account from public.chart_of_accounts where code = '1010' limit 1;

  insert into public.journal_entries (reference, description, entry_date, status, source_type, source_id, posted_by, posted_at)
  values (
    payload->>'reference',
    payload->>'description',
    coalesce((payload->>'entry_date')::date, current_date),
    'posted',
    payload->>'source_type',
    nullif(payload->>'source_id', '')::uuid,
    auth.uid(),
    now()
  ) returning id into entry_id;

  for line in select * from jsonb_array_elements(payload->'lines')
  loop
    insert into public.journal_lines (journal_entry_id, account_id, description, debit, credit)
    values (
      entry_id,
      (line->>'account_id')::uuid,
      line->>'description',
      coalesce((line->>'debit')::numeric, 0),
      coalesce((line->>'credit')::numeric, 0)
    );
    total_debit := total_debit + coalesce((line->>'debit')::numeric, 0);
    total_credit := total_credit + coalesce((line->>'credit')::numeric, 0);
  end loop;

  if total_debit <> total_credit or total_debit = 0 then
    raise exception 'Journal entry must balance and be non-zero';
  end if;

  return entry_id;
end;
$$;

create or replace function public.confirm_collection(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  coll_id uuid;
  receipt text;
  journal_id uuid;
  cash_acct uuid;
  income_acct uuid;
  items jsonb;
  item jsonb;
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;

  select id into existing_id from public.collection_transactions where client_request_id = (payload->>'client_request_id')::uuid;
  if existing_id is not null then
    return jsonb_build_object('collection_id', existing_id, 'idempotent', true);
  end if;

  select id into cash_acct from public.chart_of_accounts where code = '1010' limit 1;
  select id into income_acct from public.chart_of_accounts where code = '4010' limit 1;

  receipt := 'OR-' || to_char(now(), 'YYYY') || '-' || lpad((select count(*) + 1 from public.collection_transactions)::text, 5, '0');

  insert into public.collection_transactions (
    receipt_number, dispatch_id, vehicle_id, driver_id,
    subtotal, discount_amount, total_amount, amount_tendered, change_amount,
    payment_method, payment_reference, verification_status, status,
    client_request_id, collected_by
  ) values (
    receipt,
    nullif(payload->>'dispatch_id', '')::uuid,
    nullif(payload->>'vehicle_id', '')::uuid,
    nullif(payload->>'driver_id', '')::uuid,
    (payload->>'subtotal')::numeric,
    coalesce((payload->>'discount_amount')::numeric, 0),
    (payload->>'total_amount')::numeric,
    nullif(payload->>'amount_tendered', '')::numeric,
    coalesce((payload->>'change_amount')::numeric, 0),
    coalesce(payload->>'payment_method', 'cash'),
    payload->>'payment_reference',
  case when coalesce(payload->>'payment_method', 'cash') in ('gcash', 'maya', 'qrph', 'bank_transfer')
       then coalesce(payload->>'verification_status', 'pending') else 'confirmed' end,
    'posted',
    (payload->>'client_request_id')::uuid,
    auth.uid()
  ) returning id into coll_id;

  items := payload->'items';
  for item in select * from jsonb_array_elements(coalesce(items, '[]'::jsonb))
  loop
    insert into public.collection_items (collection_id, item_type, description, unit_price, quantity)
    values (
      coll_id,
      item->>'item_type',
      item->>'description',
      (item->>'unit_price')::numeric,
      (item->>'quantity')::numeric
    );
  end loop;

  if cash_acct is not null and income_acct is not null then
    journal_id := public.post_journal_entry(jsonb_build_object(
      'reference', receipt,
      'description', 'Daily collection',
      'source_type', 'collection',
      'source_id', coll_id::text,
      'lines', jsonb_build_array(
        jsonb_build_object('account_id', cash_acct, 'debit', (payload->>'total_amount')::text, 'credit', '0'),
        jsonb_build_object('account_id', income_acct, 'debit', '0', 'credit', (payload->>'total_amount')::text)
      )
    ));
    update public.collection_transactions set journal_entry_id = journal_id where id = coll_id;
  end if;

  return jsonb_build_object('collection_id', coll_id, 'receipt_number', receipt, 'journal_entry_id', journal_id);
end;
$$;

create or replace function public.create_dispatch(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  new_id uuid;
  disp_no text;
  p_start timestamptz;
  p_end timestamptz;
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;

  select status into v_status from public.vehicles where id = (payload->>'vehicle_id')::uuid;
  if v_status in ('inactive', 'maintenance') then
    raise exception 'Vehicle is not available';
  end if;

  p_start := (payload->>'scheduled_departure')::timestamptz;
  p_end := coalesce((payload->>'estimated_arrival')::timestamptz, p_start + interval '8 hours');

  if public.dispatch_time_overlaps(
    (payload->>'vehicle_id')::uuid,
    (payload->>'driver_id')::uuid,
    p_start,
    p_end
  ) then
    raise exception 'Schedule conflict for vehicle or driver';
  end if;

  disp_no := 'DSP-' || to_char(now(), 'YYYY') || '-' || lpad((select count(*) + 1 from public.dispatches)::text, 4, '0');

  insert into public.dispatches (
    dispatch_number, vehicle_id, driver_id, route_id,
    scheduled_departure, estimated_arrival, status, passenger_count, notes, created_by
  ) values (
    disp_no,
    (payload->>'vehicle_id')::uuid,
    (payload->>'driver_id')::uuid,
    nullif(payload->>'route_id', '')::uuid,
    p_start,
    nullif(payload->>'estimated_arrival', '')::timestamptz,
    'scheduled',
    nullif(payload->>'passenger_count', '')::int,
    payload->>'notes',
    auth.uid()
  ) returning id into new_id;

  return jsonb_build_object('dispatch_id', new_id, 'dispatch_number', disp_no);
end;
$$;