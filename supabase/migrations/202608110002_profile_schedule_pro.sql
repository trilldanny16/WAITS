alter table public.profiles
  add column if not exists favorite_split text not null default 'Not set',
  add column if not exists is_pro boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists profiles_stripe_subscription_id_idx
  on public.profiles (stripe_subscription_id) where stripe_subscription_id is not null;

-- Authenticated profile edits may not grant or alter paid entitlement fields.
create or replace function public.protect_profile_entitlement_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() = 'authenticated' then
    new.is_pro := old.is_pro;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.subscription_status := old.subscription_status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_entitlement_fields on public.profiles;
create trigger protect_profile_entitlement_fields
  before update on public.profiles
  for each row execute function public.protect_profile_entitlement_fields();

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  gym text not null,
  city text not null default '',
  address text not null,
  lat double precision,
  lng double precision,
  workout_date date not null,
  workout_time time not null,
  workout_types text[] not null check (cardinality(workout_types) > 0),
  notes text not null default '',
  max_participants integer not null check (max_participants >= 2),
  visibility text not null check (visibility in ('friends', 'public')),
  recurring text not null default 'none' check (recurring in ('none', 'daily', 'weekly')),
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;

create policy "Authenticated users read workouts" on public.workouts
  for select to authenticated using (true);

create policy "Users host workouts within their plan" on public.workouts
  for insert to authenticated
  with check (
    host_id = auth.uid()
    and (
      max_participants <= 3
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_pro = true)
    )
  );

create policy "Hosts cancel their workouts" on public.workouts
  for delete to authenticated using (host_id = auth.uid());

create index if not exists workouts_host_date_idx on public.workouts (host_id, workout_date);
alter table public.workouts replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workouts'
  ) then
    alter publication supabase_realtime add table public.workouts;
  end if;
end $$;

create or replace function public.delete_workout_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.workout_attendees where workout_id = old.id::text;
  return old;
end;
$$;

drop trigger if exists delete_workout_attendance on public.workouts;
create trigger delete_workout_attendance
  after delete on public.workouts
  for each row execute function public.delete_workout_attendance();
