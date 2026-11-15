-- 013: storage buckets (run in SQL editor; adjust if buckets exist)
insert into storage.buckets (id, name, public)
values
  ('member-docs', 'member-docs', false),
  ('vehicle-docs', 'vehicle-docs', false),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy member_docs_staff on storage.objects
  for all using (bucket_id = 'member-docs' and public.is_staff());

create policy vehicle_docs_staff on storage.objects
  for all using (bucket_id = 'vehicle-docs' and public.is_staff());

create policy receipts_staff on storage.objects
  for all using (bucket_id = 'receipts' and public.is_staff());