-- Messaging preferences are private. Existing entitlement rules remain restrictive.
create schema messaging_private;
revoke all on schema messaging_private from public, anon;
grant usage on schema messaging_private to authenticated;
create table public.messaging_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 who_can_message text not null default 'friends' check (who_can_message in ('friends','everyone','no_one')),
 show_when_online boolean not null default true
);
alter table public.messaging_preferences enable row level security;
revoke all on public.messaging_preferences from anon, authenticated;
grant select, insert, update on public.messaging_preferences to authenticated;
create policy "Own messaging preferences" on public.messaging_preferences for select to authenticated using (user_id=(select auth.uid()));
create policy "Create own messaging preferences" on public.messaging_preferences for insert to authenticated with check (user_id=(select auth.uid()));
create policy "Update own messaging preferences" on public.messaging_preferences for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create function messaging_private.can_initiate_message(sender uuid, recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()=sender and sender<>recipient
 and exists(select 1 from public.profiles where id=sender and is_pro)
 and exists(select 1 from public.profiles where id=recipient and is_pro)
 and not private.users_are_blocked(sender,recipient)
 and (
 coalesce((select who_can_message from public.messaging_preferences where user_id=recipient),'friends')='everyone'
 or (coalesce((select who_can_message from public.messaging_preferences where user_id=recipient),'friends')='friends'
 and exists(select 1 from public.friend_requests where status='accepted' and
 ((sender_id=sender and receiver_id=recipient) or (sender_id=recipient and receiver_id=sender))))
 );
$$;
revoke all on function messaging_private.can_initiate_message(uuid,uuid) from public, anon;
grant execute on function messaging_private.can_initiate_message(uuid,uuid) to authenticated;

create function messaging_private.can_access_direct_conversation(conversation uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.direct_conversations c
 join public.profiles a on a.id=c.participant_a join public.profiles b on b.id=c.participant_b
 where c.id=conversation and auth.uid() in(c.participant_a,c.participant_b)
 and a.is_pro and b.is_pro and not private.users_are_blocked(c.participant_a,c.participant_b));
$$;
revoke all on function messaging_private.can_access_direct_conversation(uuid) from public, anon;
grant execute on function messaging_private.can_access_direct_conversation(uuid) to authenticated;

-- A durable started marker prevents deleting messages from resetting initiation.
alter table public.direct_conversations add column started_at timestamptz;
update public.direct_conversations c set started_at=(select min(created_at) from public.direct_messages where conversation_id=c.id);
drop policy "Pro connections start direct conversations" on public.direct_conversations;
create policy "Privacy permits initiating conversations" on public.direct_conversations for insert to authenticated with check (
 created_by=(select auth.uid()) and created_by in(participant_a,participant_b)
 and messaging_private.can_initiate_message(created_by,case when created_by=participant_a then participant_b else participant_a end)
 and started_at is null
);
drop policy "Connected participants read direct conversations" on public.direct_conversations;
create policy "Unblocked participants read conversations" on public.direct_conversations for select to authenticated using (
 (select auth.uid()) in(participant_a,participant_b) and not private.users_are_blocked(participant_a,participant_b)
);
drop policy "Connected participants read direct messages" on public.direct_messages;
create policy "Participants read messages" on public.direct_messages for select to authenticated using (messaging_private.can_access_direct_conversation(conversation_id));
drop policy "Connected participants send own direct messages" on public.direct_messages;
create policy "Participants send own messages" on public.direct_messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and messaging_private.can_access_direct_conversation(conversation_id)
);
-- Check the first actual message, not only creation of an empty conversation.
create function messaging_private.enforce_direct_message_initiation()
returns trigger language plpgsql security definer set search_path='' as $$
declare c public.direct_conversations%rowtype; recipient uuid;
begin
 if auth.uid() is null or new.sender_id<>auth.uid() then raise exception 'Invalid message sender' using errcode='42501'; end if;
 select * into c from public.direct_conversations where id=new.conversation_id for update;
 if not found or not messaging_private.can_access_direct_conversation(c.id) then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 if c.started_at is null then
  recipient:=case when new.sender_id=c.participant_a then c.participant_b else c.participant_a end;
  if not messaging_private.can_initiate_message(new.sender_id,recipient) then raise exception 'Recipient messaging privacy does not allow this conversation' using errcode='42501'; end if;
  update public.direct_conversations set started_at=now() where id=c.id;
 end if;
 return new;
end;
$$;
revoke all on function messaging_private.enforce_direct_message_initiation() from public, anon, authenticated;
create trigger enforce_direct_message_initiation before insert on public.direct_messages for each row execute function messaging_private.enforce_direct_message_initiation();

create table public.messaging_presence (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 last_active_at timestamptz not null default now()
);
alter table public.messaging_presence enable row level security;
revoke all on public.messaging_presence from anon, authenticated;
grant select,insert,update on public.messaging_presence to authenticated;
create function messaging_private.can_see_messaging_presence(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (auth.uid()=target or (
 coalesce((select show_when_online from public.messaging_preferences where user_id=target),true)
 and not private.users_are_blocked(auth.uid(),target)
 and exists(select 1 from public.friend_requests where status='accepted' and
 ((sender_id=auth.uid() and receiver_id=target) or (sender_id=target and receiver_id=auth.uid())))
 ));
$$;
revoke all on function messaging_private.can_see_messaging_presence(uuid) from public, anon;
grant execute on function messaging_private.can_see_messaging_presence(uuid) to authenticated;
create policy "Eligible friends see presence" on public.messaging_presence for select to authenticated using (messaging_private.can_see_messaging_presence(user_id));
create policy "Own presence insert" on public.messaging_presence for insert to authenticated with check (user_id=(select auth.uid()));
create policy "Own presence update" on public.messaging_presence for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create function messaging_private.stamp_messaging_presence() returns trigger language plpgsql set search_path='' as $$
begin new.last_active_at:=now(); return new; end;
$$;
revoke all on function messaging_private.stamp_messaging_presence() from public,anon,authenticated;
create trigger stamp_messaging_presence before insert or update on public.messaging_presence for each row execute function messaging_private.stamp_messaging_presence();

create table public.direct_conversation_reads (
 conversation_id uuid references public.direct_conversations(id) on delete cascade,
 user_id uuid references public.profiles(id) on delete cascade,
 last_read_at timestamptz not null default now(),
 primary key(conversation_id,user_id)
);
alter table public.direct_conversation_reads enable row level security;
create index direct_conversation_reads_user_idx on public.direct_conversation_reads(user_id);
revoke all on public.direct_conversation_reads from anon,authenticated;
grant select,insert,update on public.direct_conversation_reads to authenticated;
create policy "Own conversation read marker" on public.direct_conversation_reads for select to authenticated using (user_id=(select auth.uid()) and messaging_private.can_access_direct_conversation(conversation_id));
create policy "Create own read marker" on public.direct_conversation_reads for insert to authenticated with check (user_id=(select auth.uid()) and messaging_private.can_access_direct_conversation(conversation_id));
create policy "Update own read marker" on public.direct_conversation_reads for update to authenticated using (user_id=(select auth.uid()) and messaging_private.can_access_direct_conversation(conversation_id)) with check (user_id=(select auth.uid()) and messaging_private.can_access_direct_conversation(conversation_id));
create function messaging_private.stamp_direct_read() returns trigger language plpgsql set search_path='' as $$
begin new.last_read_at:=now(); return new; end;
$$;
revoke all on function messaging_private.stamp_direct_read() from public,anon,authenticated;
create trigger stamp_direct_read before insert or update on public.direct_conversation_reads for each row execute function messaging_private.stamp_direct_read();

-- Only minimal recipient data is exposed; no emails or preference rows.
create function public.get_messaging_recipients(search_text text default '')
returns table(id uuid,display_name text,username text,avatar_path text,is_pro boolean)
language sql stable security invoker set search_path='' as $$
 select p.id,p.display_name,p.username,p.avatar_path,p.is_pro from public.profiles p
 where auth.uid() is not null and messaging_private.can_initiate_message(auth.uid(),p.id)
 and (coalesce(search_text,'')='' or p.display_name ilike '%'||left(search_text,80)||'%' or p.username ilike '%'||left(search_text,80)||'%')
 order by exists(select 1 from public.friend_requests f where f.status='accepted'
 and ((f.sender_id=auth.uid() and f.receiver_id=p.id) or(f.sender_id=p.id and f.receiver_id=auth.uid()))) desc,
 p.display_name,p.id limit 50;
$$;
revoke all on function public.get_messaging_recipients(text) from public,anon;
grant execute on function public.get_messaging_recipients(text) to authenticated;
create function public.get_messaging_inbox()
returns table(conversation_id uuid,recipient_id uuid,last_message text,last_message_at timestamptz,unread_count bigint)
language sql stable security invoker set search_path='' as $$
 select c.id,case when c.participant_a=auth.uid() then c.participant_b else c.participant_a end,
 coalesce(m.text,case when m.media_path is not null then 'Photo' end),m.created_at,
 (select count(*) from public.direct_messages x where x.conversation_id=c.id and x.sender_id<>auth.uid()
 and x.created_at>coalesce(r.last_read_at,'-infinity'::timestamptz))
 from public.direct_conversations c
 left join lateral(select text,media_path,created_at from public.direct_messages where conversation_id=c.id order by created_at desc,id desc limit 1)m on true
 left join public.direct_conversation_reads r on r.conversation_id=c.id and r.user_id=auth.uid()
 order by coalesce(m.created_at,c.created_at) desc;
$$;
revoke all on function public.get_messaging_inbox() from public,anon;
grant execute on function public.get_messaging_inbox() to authenticated;
create index if not exists direct_messages_inbox_latest_idx on public.direct_messages(conversation_id,created_at desc,id desc);
