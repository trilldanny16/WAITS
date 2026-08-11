create table if not exists public.workout_attendees (
  workout_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (workout_id, user_id)
);

create index if not exists workout_attendees_user_id_idx
  on public.workout_attendees (user_id);

alter table public.workout_attendees enable row level security;

drop policy if exists "Authenticated users read workout attendance" on public.workout_attendees;
create policy "Authenticated users read workout attendance"
  on public.workout_attendees for select to authenticated
  using (true);

drop policy if exists "Users join workouts as themselves" on public.workout_attendees;
create policy "Users join workouts as themselves"
  on public.workout_attendees for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users leave workouts as themselves" on public.workout_attendees;
create policy "Users leave workouts as themselves"
  on public.workout_attendees for delete to authenticated
  using (user_id = auth.uid());

alter table public.workout_attendees replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workout_attendees'
  ) then
    alter publication supabase_realtime add table public.workout_attendees;
  end if;
end $$;
