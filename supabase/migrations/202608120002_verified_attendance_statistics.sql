create table if not exists public.workout_attendance_outcomes (
  workout_id uuid not null references public.workouts(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  outcome text not null check (outcome in ('attended', 'no_show')),
  verified_at timestamptz not null default now(),
  verified_by uuid not null references public.profiles(id),
  primary key (workout_id, participant_id)
);

create index if not exists workout_attendance_outcomes_participant_idx
  on public.workout_attendance_outcomes (participant_id, verified_at desc);

alter table public.workout_attendance_outcomes enable row level security;

drop policy if exists "Participants read own verified outcomes" on public.workout_attendance_outcomes;
create policy "Participants read own verified outcomes"
  on public.workout_attendance_outcomes for select to authenticated
  using (
    participant_id = auth.uid()
    or exists (
      select 1 from public.workouts workout
      where workout.id = workout_id and workout.host_id = auth.uid()
    )
  );

drop policy if exists "Workout hosts verify persisted attendees" on public.workout_attendance_outcomes;
create policy "Workout hosts verify persisted attendees"
  on public.workout_attendance_outcomes for insert to authenticated
  with check (
    verified_by = auth.uid()
    and participant_id <> auth.uid()
    and exists (
      select 1 from public.workouts workout
      where workout.id = workout_id
        and workout.host_id = auth.uid()
        and (workout.workout_date + workout.workout_time) <= now()
    )
    and exists (
      select 1 from public.workout_attendees attendee
      where attendee.workout_id = workout_id::text
        and attendee.user_id = participant_id
    )
  );

drop policy if exists "Workout hosts update persisted attendee outcomes" on public.workout_attendance_outcomes;
create policy "Workout hosts update persisted attendee outcomes"
  on public.workout_attendance_outcomes for update to authenticated
  using (
    exists (
      select 1 from public.workouts workout
      where workout.id = workout_id and workout.host_id = auth.uid()
    )
  )
  with check (
    verified_by = auth.uid()
    and participant_id <> auth.uid()
    and exists (
      select 1 from public.workouts workout
      where workout.id = workout_id
        and workout.host_id = auth.uid()
        and (workout.workout_date + workout.workout_time) <= now()
    )
    and exists (
      select 1 from public.workout_attendees attendee
      where attendee.workout_id = workout_id::text
        and attendee.user_id = participant_id
    )
  );

create or replace function public.verify_workout_attendance(
  target_workout_id uuid,
  target_participant_id uuid,
  target_outcome text
)
returns public.workout_attendance_outcomes
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved public.workout_attendance_outcomes;
begin
  if target_outcome not in ('attended', 'no_show') then
    raise exception 'Invalid attendance outcome';
  end if;

  insert into public.workout_attendance_outcomes (
    workout_id, participant_id, outcome, verified_at, verified_by
  )
  values (
    target_workout_id, target_participant_id, target_outcome, now(), auth.uid()
  )
  on conflict (workout_id, participant_id)
  do update set
    outcome = excluded.outcome,
    verified_at = now(),
    verified_by = auth.uid()
  returning * into saved;

  return saved;
end;
$$;

revoke all on function public.verify_workout_attendance(uuid, uuid, text) from public;
grant execute on function public.verify_workout_attendance(uuid, uuid, text) to authenticated;

create or replace function public.get_profile_verified_attendance(target_profile_id uuid)
returns table (outcome text, workout_date date)
language sql
stable
security definer
set search_path = public
as $$
  select attendance.outcome, workout.workout_date
  from public.workout_attendance_outcomes attendance
  join public.workouts workout on workout.id = attendance.workout_id
  where attendance.participant_id = target_profile_id
  order by workout.workout_date desc;
$$;

revoke all on function public.get_profile_verified_attendance(uuid) from public;
grant execute on function public.get_profile_verified_attendance(uuid) to authenticated;
