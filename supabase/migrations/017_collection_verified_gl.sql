-- 017: Post GL only for confirmed collections; dev driver seed

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
  v_status text;
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;

  select id into existing_id from public.collection_transactions where client_request_id = (payload->>'client_request_id')::uuid;
  if existing_id is not null then
    return jsonb_build_object('collection_id', existing_id, 'idempotent', true);
  end if;

  v_status := case when coalesce(payload->>'payment_method', 'cash') in ('gcash', 'maya', 'qrph', 'bank_transfer')
       then coalesce(payload->>'verification_status', 'pending') else 'confirmed' end;

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
    v_status,
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

  if v_status = 'confirmed' and cash_acct is not null and income_acct is not null then
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

  return jsonb_build_object(
    'collection_id', coll_id,
    'receipt_number', receipt,
    'journal_entry_id', journal_id,
    'verification_status', v_status
  );
end;
$$;

insert into public.drivers (full_name, license_number, status)
select 'Rogelio Mendez', 'N01-123456', 'available'
where not exists (select 1 from public.drivers);