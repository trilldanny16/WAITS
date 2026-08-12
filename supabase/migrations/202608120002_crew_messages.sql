create table if not exists public.crew_messages (
  id uuid primary key default gen_random_uuid(),
  workout_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.crew_messages
  add column if not exists updated_at timestamptz;

create index if not exists crew_messages_workout_created_idx
  on public.crew_messages (workout_id, created_at);

alter table public.crew_messages enable row level security;

drop policy if exists "Crew members read messages" on public.crew_messages;
create policy "Crew members read messages"
  on public.crew_messages for select to authenticated
  using (
    exists (
      select 1
      from public.workouts workout
      where workout.id::text = crew_messages.workout_id
        and workout.host_id = auth.uid()
    )
    or exists (
      select 1
      from public.workout_attendees attendee
      where attendee.workout_id = crew_messages.workout_id
        and attendee.user_id = auth.uid()
    )
  );

drop policy if exists "Crew members send own messages" on public.crew_messages;
create policy "Crew members send own messages"
  on public.crew_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1
        from public.workouts workout
        where workout.id::text = crew_messages.workout_id
          and workout.host_id = auth.uid()
      )
      or exists (
        select 1
        from public.workout_attendees attendee
        where attendee.workout_id = crew_messages.workout_id
          and attendee.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Message owners update their messages" on public.crew_messages;
create policy "Message owners update their messages"
  on public.crew_messages for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Message owners delete their messages" on public.crew_messages;
create policy "Message owners delete their messages"
  on public.crew_messages for delete to authenticated
  using (user_id = auth.uid());

alter table public.crew_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'crew_messages'
  ) then
    alter publication supabase_realtime add table public.crew_messages;
  end if;
end $$;
