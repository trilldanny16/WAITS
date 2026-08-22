-- Images/GIFs in Community and Crew chats plus mutual-connection personal DMs.
alter table public.community_messages alter column text drop not null;
alter table public.community_messages add column if not exists media_path text;
alter table public.community_messages add column if not exists media_kind text;
alter table public.community_messages drop constraint if exists community_messages_text_check;
alter table public.community_messages drop constraint if exists community_messages_text_valid;
alter table public.community_messages drop constraint if exists community_messages_content_valid;
alter table public.community_messages add constraint community_messages_content_valid check (
  (text is not null and char_length(btrim(text)) between 1 and 1000)
  or (media_path is not null and media_kind in ('image','gif')
    and char_length(media_path) between 1 and 500
    and media_path !~ '(^|/)\.\.(/|$)' and media_path !~ '[[:cntrl:]]'
    and media_path like user_id::text || '/%')
);

alter table public.crew_messages alter column text drop not null;
alter table public.crew_messages add column if not exists media_path text;
alter table public.crew_messages add column if not exists media_kind text;
alter table public.crew_messages drop constraint if exists crew_messages_text_check;
alter table public.crew_messages drop constraint if exists crew_messages_text_valid;
alter table public.crew_messages drop constraint if exists crew_messages_content_valid;
alter table public.crew_messages add constraint crew_messages_content_valid check (
  (text is not null and char_length(btrim(text)) between 1 and 1000)
  or (media_path is not null and media_kind in ('image','gif')
    and char_length(media_path) between 1 and 500
    and media_path !~ '(^|/)\.\.(/|$)' and media_path !~ '[[:cntrl:]]'
    and media_path like user_id::text || '/%')
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('chat-media','chat-media',false,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint direct_conversations_distinct check (participant_a < participant_b),
  constraint direct_conversations_creator_member check (created_by in (participant_a,participant_b)),
  constraint direct_conversations_pair_unique unique (participant_a,participant_b)
);
create index if not exists direct_conversations_a_idx on public.direct_conversations(participant_a,created_at desc);
create index if not exists direct_conversations_b_idx on public.direct_conversations(participant_b,created_at desc);
alter table public.direct_conversations enable row level security;

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text,
  media_path text,
  media_kind text,
  created_at timestamptz not null default now(),
  constraint direct_messages_content_valid check (
    (text is not null and char_length(btrim(text)) between 1 and 1000)
    or (media_path is not null and media_kind in ('image','gif')
      and char_length(media_path) between 1 and 500
      and media_path !~ '(^|/)\.\.(/|$)' and media_path !~ '[[:cntrl:]]'
      and media_path like sender_id::text || '/%')
  )
);
create index if not exists direct_messages_conversation_created_idx on public.direct_messages(conversation_id,created_at);
alter table public.direct_messages enable row level security;

drop policy if exists "Pro connections start direct conversations" on public.direct_conversations;
create policy "Pro connections start direct conversations" on public.direct_conversations
for insert to authenticated with check (
  created_by=(select auth.uid()) and (select auth.uid()) in (participant_a,participant_b)
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_pro=true)
  and exists (select 1 from public.friend_requests fr where fr.status='accepted' and
    ((fr.sender_id=participant_a and fr.receiver_id=participant_b)
      or (fr.sender_id=participant_b and fr.receiver_id=participant_a)))
);

drop policy if exists "Participants read direct conversations" on public.direct_conversations;
drop policy if exists "Connected participants read direct conversations" on public.direct_conversations;
create policy "Connected participants read direct conversations" on public.direct_conversations
for select to authenticated using (
  (select auth.uid()) in (participant_a,participant_b)
  and exists (select 1 from public.friend_requests fr where fr.status='accepted' and
    ((fr.sender_id=participant_a and fr.receiver_id=participant_b)
      or (fr.sender_id=participant_b and fr.receiver_id=participant_a)))
);

drop policy if exists "Participants read direct messages" on public.direct_messages;
drop policy if exists "Connected participants read direct messages" on public.direct_messages;
create policy "Connected participants read direct messages" on public.direct_messages
for select to authenticated using (exists (
  select 1 from public.direct_conversations dc where dc.id=conversation_id
    and (select auth.uid()) in (dc.participant_a,dc.participant_b)
    and exists (select 1 from public.friend_requests fr where fr.status='accepted' and
      ((fr.sender_id=dc.participant_a and fr.receiver_id=dc.participant_b)
        or (fr.sender_id=dc.participant_b and fr.receiver_id=dc.participant_a)))
));

drop policy if exists "Participants send own direct messages" on public.direct_messages;
drop policy if exists "Connected participants send own direct messages" on public.direct_messages;
create policy "Connected participants send own direct messages" on public.direct_messages
for insert to authenticated with check (
  sender_id=(select auth.uid()) and exists (
    select 1 from public.direct_conversations dc where dc.id=conversation_id
      and (select auth.uid()) in (dc.participant_a,dc.participant_b)
      and exists (select 1 from public.friend_requests fr where fr.status='accepted' and
        ((fr.sender_id=dc.participant_a and fr.receiver_id=dc.participant_b)
          or (fr.sender_id=dc.participant_b and fr.receiver_id=dc.participant_a)))
  )
);

drop policy if exists "Senders delete own direct messages" on public.direct_messages;
create policy "Senders delete own direct messages" on public.direct_messages
for delete to authenticated using (sender_id=(select auth.uid()));

drop policy if exists "Users upload own chat media" on storage.objects;
create policy "Users upload own chat media" on storage.objects
for insert to authenticated with check (
  bucket_id='chat-media' and (storage.foldername(name))[1]=(select auth.uid())::text
);
drop policy if exists "Authorized users read chat media" on storage.objects;
create policy "Authorized users read chat media" on storage.objects
for select to authenticated using (
  bucket_id='chat-media' and (
    exists (select 1 from public.community_messages cm where cm.media_path=name and cm.created_at>now()-interval '24 hours')
    or exists (select 1 from public.crew_messages cm where cm.media_path=name and (
      exists (select 1 from public.workouts w where w.id=cm.workout_id and w.host_id=(select auth.uid()))
      or (exists (select 1 from public.workout_attendees wa where wa.workout_id=cm.workout_id and wa.user_id=(select auth.uid()))
        and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_pro=true))
    ))
    or exists (select 1 from public.direct_messages dm join public.direct_conversations dc on dc.id=dm.conversation_id
      where dm.media_path=name and (select auth.uid()) in (dc.participant_a,dc.participant_b))
  )
);
drop policy if exists "Users delete own chat media" on storage.objects;
create policy "Users delete own chat media" on storage.objects
for delete to authenticated using (bucket_id='chat-media' and owner_id=(select auth.uid())::text);

grant select,insert on public.direct_conversations to authenticated;
grant select,insert,delete on public.direct_messages to authenticated;
grant select,insert,update,delete on public.community_messages to authenticated;
grant select,insert,update,delete on public.crew_messages to authenticated;
