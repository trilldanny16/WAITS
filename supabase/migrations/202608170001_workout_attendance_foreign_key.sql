-- Keep persisted attendance tied to a real workout and remove legacy orphan rows.
delete from public.workout_attendees attendee
where not exists (
  select 1
  from public.workouts workout
  where workout.id::text = attendee.workout_id
);

drop policy if exists "Crew members read messages" on public.crew_messages;
drop policy if exists "Crew members send own messages" on public.crew_messages;
drop policy if exists "Message owners update their messages" on public.crew_messages;
drop policy if exists "Workout hosts verify persisted attendees" on public.workout_attendance_outcomes;
drop policy if exists "Workout hosts update persisted attendee outcomes" on public.workout_attendance_outcomes;

drop trigger if exists delete_workout_attendance on public.workouts;
drop function if exists public.delete_workout_attendance();

alter table public.workout_attendees
  alter column workout_id type uuid using workout_id::uuid;

alter table public.workout_attendees
  add constraint workout_attendees_workout_id_fkey
  foreign key (workout_id)
  references public.workouts(id)
  on delete cascade;

create or replace function public.enforce_workout_attendee_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  workout_row public.workouts%rowtype;
  joined_count integer;
begin
  select *
  into workout_row
  from public.workouts
  where id = new.workout_id
  for update;

  if not found then
    raise exception 'That workout is no longer available.';
  end if;

  if new.user_id = workout_row.host_id then
    raise exception 'The workout host is already an attendee.';
  end if;

  select count(*)
  into joined_count
  from public.workout_attendees
  where workout_id = new.workout_id;

  if joined_count + 1 >= workout_row.max_participants then
    raise exception 'That workout is full.';
  end if;

  return new;
end;
$$;

create policy "Crew members read messages"
on public.crew_messages
for select
to authenticated
using (
  exists (
    select 1 from public.workouts workout
    where workout.id = crew_messages.workout_id
      and workout.host_id = (select auth.uid())
  )
  or (
    exists (
      select 1 from public.workout_attendees attendee
      where attendee.workout_id = crew_messages.workout_id
        and attendee.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.is_pro = true
    )
  )
);

create policy "Crew members send own messages"
on public.crew_messages
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.workouts workout
      where workout.id = crew_messages.workout_id
        and workout.host_id = (select auth.uid())
    )
    or (
      exists (
        select 1 from public.workout_attendees attendee
        where attendee.workout_id = crew_messages.workout_id
          and attendee.user_id = (select auth.uid())
      )
      and exists (
        select 1 from public.profiles profile
        where profile.id = (select auth.uid())
          and profile.is_pro = true
      )
    )
  )
);

create policy "Message owners update their messages"
on public.crew_messages
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.workouts workout
      where workout.id = crew_messages.workout_id
        and workout.host_id = (select auth.uid())
    )
    or (
      exists (
        select 1 from public.workout_attendees attendee
        where attendee.workout_id = crew_messages.workout_id
          and attendee.user_id = (select auth.uid())
      )
      and exists (
        select 1 from public.profiles profile
        where profile.id = (select auth.uid())
          and profile.is_pro = true
      )
    )
  )
);

create policy "Workout hosts verify persisted attendees"
on public.workout_attendance_outcomes
for insert
to authenticated
with check (
  verified_by = (select auth.uid())
  and participant_id <> (select auth.uid())
  and exists (
    select 1 from public.workouts workout
    where workout.id = workout_attendance_outcomes.workout_id
      and workout.host_id = (select auth.uid())
      and workout.workout_date + workout.workout_time <= now()
  )
  and exists (
    select 1 from public.workout_attendees attendee
    where attendee.workout_id = workout_attendance_outcomes.workout_id
      and attendee.user_id = workout_attendance_outcomes.participant_id
  )
);

create policy "Workout hosts update persisted attendee outcomes"
on public.workout_attendance_outcomes
for update
to authenticated
using (
  exists (
    select 1 from public.workouts workout
    where workout.id = workout_attendance_outcomes.workout_id
      and workout.host_id = (select auth.uid())
  )
)
with check (
  verified_by = (select auth.uid())
  and participant_id <> (select auth.uid())
  and exists (
    select 1 from public.workouts workout
    where workout.id = workout_attendance_outcomes.workout_id
      and workout.host_id = (select auth.uid())
      and workout.workout_date + workout.workout_time <= now()
  )
  and exists (
    select 1 from public.workout_attendees attendee
    where attendee.workout_id = workout_attendance_outcomes.workout_id
      and attendee.user_id = workout_attendance_outcomes.participant_id
  )
);
