create or replace function public.enforce_workout_attendee_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workout_row public.workouts%rowtype;
  joined_count integer;
begin
  -- Prototype workout IDs (for example w2) are intentionally local-only.
  -- Persisted workouts use UUID IDs and are protected atomically here.
  if new.workout_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return new;
  end if;

  select *
  into workout_row
  from public.workouts
  where id::text = new.workout_id
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

  -- The host always occupies one participant spot even though hosts are not
  -- duplicated in workout_attendees.
  if joined_count + 1 >= workout_row.max_participants then
    raise exception 'That workout is full.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_workout_attendee_capacity
on public.workout_attendees;

create trigger enforce_workout_attendee_capacity
before insert on public.workout_attendees
for each row
execute function public.enforce_workout_attendee_capacity();