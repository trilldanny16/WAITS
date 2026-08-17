drop policy if exists "Crew members read messages" on public.crew_messages;
create policy "Crew members read messages"
on public.crew_messages
for select
to authenticated
using (
  exists (
    select 1 from public.workouts workout
    where workout.id = crew_messages.workout_id
      and workout.host_id = auth.uid()
  )
  or (
    exists (
      select 1 from public.workout_attendees attendee
      where attendee.workout_id = crew_messages.workout_id::text
        and attendee.user_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.is_pro = true
    )
  )
);

drop policy if exists "Crew members send own messages" on public.crew_messages;
create policy "Crew members send own messages"
on public.crew_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1 from public.workouts workout
      where workout.id = crew_messages.workout_id
        and workout.host_id = auth.uid()
    )
    or (
      exists (
        select 1 from public.workout_attendees attendee
        where attendee.workout_id = crew_messages.workout_id::text
          and attendee.user_id = auth.uid()
      )
      and exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid()
          and profile.is_pro = true
      )
    )
  )
);

drop policy if exists "Message owners update their messages" on public.crew_messages;
create policy "Message owners update their messages"
on public.crew_messages
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1 from public.workouts workout
      where workout.id = crew_messages.workout_id
        and workout.host_id = auth.uid()
    )
    or (
      exists (
        select 1 from public.workout_attendees attendee
        where attendee.workout_id = crew_messages.workout_id::text
          and attendee.user_id = auth.uid()
      )
      and exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid()
          and profile.is_pro = true
      )
    )
  )
);

create or replace function public.protect_crew_message_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.workout_id := old.workout_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_crew_message_fields on public.crew_messages;
create trigger protect_crew_message_fields
before update on public.crew_messages
for each row execute function public.protect_crew_message_fields();

create or replace function public.protect_community_message_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_community_message_fields on public.community_messages;
create trigger protect_community_message_fields
before update on public.community_messages
for each row execute function public.protect_community_message_fields();

drop policy if exists "Workout hosts verify persisted attendees"
on public.workout_attendance_outcomes;
create policy "Workout hosts verify persisted attendees"
on public.workout_attendance_outcomes
for insert
to authenticated
with check (
  verified_by = auth.uid()
  and participant_id <> auth.uid()
  and exists (
    select 1 from public.workouts workout
    where workout.id = workout_attendance_outcomes.workout_id
      and workout.host_id = auth.uid()
      and (workout.workout_date + workout.workout_time) <= now()
  )
  and exists (
    select 1 from public.workout_attendees attendee
    where attendee.workout_id = workout_attendance_outcomes.workout_id::text
      and attendee.user_id = workout_attendance_outcomes.participant_id
  )
);

drop policy if exists "Workout hosts update persisted attendee outcomes"
on public.workout_attendance_outcomes;
create policy "Workout hosts update persisted attendee outcomes"
on public.workout_attendance_outcomes
for update
to authenticated
using (
  exists (
    select 1 from public.workouts workout
    where workout.id = workout_attendance_outcomes.workout_id
      and workout.host_id = auth.uid()
  )
)
with check (
  verified_by = auth.uid()
  and participant_id <> auth.uid()
  and exists (
    select 1 from public.workouts workout
    where workout.id = workout_attendance_outcomes.workout_id
      and workout.host_id = auth.uid()
      and (workout.workout_date + workout.workout_time) <= now()
  )
  and exists (
    select 1 from public.workout_attendees attendee
    where attendee.workout_id = workout_attendance_outcomes.workout_id::text
      and attendee.user_id = workout_attendance_outcomes.participant_id
  )
);

create or replace function public.protect_workout_attendance_outcome_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.workout_id := old.workout_id;
  new.participant_id := old.participant_id;
  new.verified_by := auth.uid();
  new.verified_at := now();
  return new;
end;
$$;

drop trigger if exists protect_workout_attendance_outcome_fields
on public.workout_attendance_outcomes;
create trigger protect_workout_attendance_outcome_fields
before update on public.workout_attendance_outcomes
for each row execute function public.protect_workout_attendance_outcome_fields();