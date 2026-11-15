-- 005: dispatch and trip records
create table public.dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_number text not null unique,
  vehicle_id uuid not null references public.vehicles (id),
  driver_id uuid not null references public.drivers (id),
  route_id uuid references public.routes (id),
  scheduled_departure timestamptz not null,
  estimated_arrival timestamptz,
  actual_departure timestamptz,
  actual_arrival timestamptz,
  status text not null default 'scheduled',
  passenger_count int,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.trip_records (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null unique references public.dispatches (id) on delete cascade,
  trip_number text not null unique,
  completed_at timestamptz,
  distance_km numeric(10, 2),
  summary jsonb default '{}'::jsonb
);

create index dispatches_vehicle_time_idx on public.dispatches (vehicle_id, scheduled_departure);
create index dispatches_driver_time_idx on public.dispatches (driver_id, scheduled_departure);

create or replace function public.dispatch_time_overlaps(
  p_vehicle_id uuid,
  p_driver_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude uuid default null
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.dispatches d
    where d.status in ('scheduled', 'ongoing')
      and (p_exclude is null or d.id <> p_exclude)
      and (
        (d.vehicle_id = p_vehicle_id or d.driver_id = p_driver_id)
        and tstzrange(d.scheduled_departure, coalesce(d.estimated_arrival, d.scheduled_departure + interval '8 hours'))
            && tstzrange(p_start, p_end)
      )
  );
$$;