create table if not exists public.workout_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, workout_id)
);

alter table public.workout_notifications enable row level security;

drop policy if exists "Recipients read workout notifications"
on public.workout_notifications;
create policy "Recipients read workout notifications"
on public.workout_notifications
for select
to authenticated
using (recipient_id = auth.uid());

drop policy if exists "Recipients mark workout notifications read"
on public.workout_notifications;
create policy "Recipients mark workout notifications read"
on public.workout_notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create or replace function public.protect_workout_notification_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.recipient_id := old.recipient_id;
  new.actor_id := old.actor_id;
  new.workout_id := old.workout_id;
  new.message := old.message;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_workout_notification_fields
on public.workout_notifications;
create trigger protect_workout_notification_fields
before update on public.workout_notifications
for each row execute function public.protect_workout_notification_fields();

create or replace function public.notify_followers_about_workout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  workout_message text;
begin
  select coalesce(nullif(upper(split_part(display_name, ' ', 1)), ''), 'YOUR FRIEND')
  into actor_name
  from public.profiles
  where id = new.host_id;

  workout_message :=
    coalesce(actor_name, 'YOUR FRIEND')
    || ' is hitting the gym @'
    || to_char(new.workout_time, 'FMHH12:MI AM')
    || '! Wanna join?';

  insert into public.workout_notifications (
    recipient_id,
    actor_id,
    workout_id,
    message
  )
  select
    case
      when request.sender_id = new.host_id then request.receiver_id
      else request.sender_id
    end,
    new.host_id,
    new.id,
    workout_message
  from public.friend_requests request
  where request.status = 'accepted'
    and (request.sender_id = new.host_id or request.receiver_id = new.host_id)
  on conflict (recipient_id, workout_id) do nothing;

  return new;
end;
$$;

drop trigger if exists notify_followers_about_workout
on public.workouts;
create trigger notify_followers_about_workout
after insert on public.workouts
for each row execute function public.notify_followers_about_workout();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workout_notifications'
  ) then
    alter publication supabase_realtime add table public.workout_notifications;
  end if;
end;
$$;