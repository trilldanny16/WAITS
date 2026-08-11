-- Community Chat is intentionally separate from prototype crew-chat state so
-- private/direct chat persistence and retention remain unchanged.
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists community_messages_created_at_idx
  on public.community_messages (created_at);

create or replace function public.set_community_message_created_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists set_community_message_created_at on public.community_messages;
create trigger set_community_message_created_at
  before insert or update on public.community_messages
  for each row execute function public.set_community_message_created_at();

alter table public.community_messages enable row level security;

drop policy if exists "Authenticated users read current community messages" on public.community_messages;
create policy "Authenticated users read current community messages"
  on public.community_messages for select to authenticated
  using (created_at > now() - interval '24 hours');

drop policy if exists "Authenticated users send community messages" on public.community_messages;
create policy "Authenticated users send community messages"
  on public.community_messages for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users update their own community messages" on public.community_messages;
create policy "Users update their own community messages"
  on public.community_messages for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users delete their own community messages" on public.community_messages;
create policy "Users delete their own community messages"
  on public.community_messages for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.purge_expired_community_messages()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.community_messages
  where created_at <= now() - interval '24 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_community_messages() from public, anon, authenticated;

-- Full old-row data lets open Realtime clients identify rows removed by cleanup.
alter table public.community_messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_messages'
  ) then
    alter publication supabase_realtime add table public.community_messages;
  end if;
end $$;

-- Scheduling is deliberately separate: first verify pg_cron is available, then
-- run the cron.schedule statement documented in supabase/COMMUNITY_CHAT_EXPIRATION.md.
