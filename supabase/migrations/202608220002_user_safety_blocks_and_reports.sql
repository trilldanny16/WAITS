-- User safety: private blocks, content reports, and database-enforced isolation.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks(blocked_id);
alter table public.user_blocks enable row level security;
create policy "Users read own blocks" on public.user_blocks for select to authenticated using (blocker_id=(select auth.uid()));
create policy "Users create own blocks" on public.user_blocks for insert to authenticated with check (blocker_id=(select auth.uid()));
create policy "Users remove own blocks" on public.user_blocks for delete to authenticated using (blocker_id=(select auth.uid()));

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user','workout','community_message','crew_message','direct_message','gallery_photo')),
  target_id text not null check (char_length(target_id) between 1 and 200),
  reason text not null check (reason in ('harassment','spam','unsafe_behavior','inappropriate_content','impersonation','other')),
  details text check (details is null or char_length(details)<=500),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id,target_type,target_id,reason)
);
alter table public.content_reports enable row level security;
create policy "Users create own reports" on public.content_reports for insert to authenticated with check (reporter_id=(select auth.uid()));
create policy "Users read own reports" on public.content_reports for select to authenticated using (reporter_id=(select auth.uid()));

create or replace function private.users_are_blocked(first_user uuid, second_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.user_blocks b where
    (b.blocker_id=first_user and b.blocked_id=second_user) or
    (b.blocker_id=second_user and b.blocked_id=first_user));
$$;
revoke all on function private.users_are_blocked(uuid,uuid) from public;
grant execute on function private.users_are_blocked(uuid,uuid) to authenticated;

create or replace function private.sever_blocked_relationship()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  delete from public.friend_requests where
    (sender_id=new.blocker_id and receiver_id=new.blocked_id) or
    (sender_id=new.blocked_id and receiver_id=new.blocker_id);
  delete from public.direct_conversations where
    (participant_a=new.blocker_id and participant_b=new.blocked_id) or
    (participant_a=new.blocked_id and participant_b=new.blocker_id);
  delete from public.workout_attendees wa using public.workouts w
    where wa.workout_id=w.id and
    ((w.host_id=new.blocker_id and wa.user_id=new.blocked_id) or
     (w.host_id=new.blocked_id and wa.user_id=new.blocker_id));
  delete from public.workout_notifications where
    (recipient_id=new.blocker_id and actor_id=new.blocked_id) or
    (recipient_id=new.blocked_id and actor_id=new.blocker_id);
  return new;
end $$;
revoke all on function private.sever_blocked_relationship() from public;
drop trigger if exists sever_blocked_relationship_trigger on public.user_blocks;
create trigger sever_blocked_relationship_trigger after insert on public.user_blocks
for each row execute function private.sever_blocked_relationship();

drop policy if exists "Authenticated users read profiles" on public.profiles;
drop policy if exists "Users can view unblocked profiles" on public.profiles;
create policy "Users can view unblocked profiles" on public.profiles for select to authenticated
using (id=(select auth.uid()) or not private.users_are_blocked((select auth.uid()),id));

drop policy if exists "Authenticated users read workouts" on public.workouts;
drop policy if exists "Users read unblocked workouts" on public.workouts;
create policy "Users read unblocked workouts" on public.workouts for select to authenticated
using (not private.users_are_blocked((select auth.uid()),host_id));

grant select,insert,delete on public.user_blocks to authenticated;
grant select,insert on public.content_reports to authenticated;
