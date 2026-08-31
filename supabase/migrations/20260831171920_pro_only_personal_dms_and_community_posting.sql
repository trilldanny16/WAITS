-- Additive restrictions preserve existing participant, friendship and ownership checks.
create policy "Personal DMs require Pro participants" on public.direct_conversations
as restrictive for all to authenticated
using (
 exists (select 1 from public.profiles p where p.id = participant_a and p.is_pro = true)
 and exists (select 1 from public.profiles p where p.id = participant_b and p.is_pro = true)
)
with check (
 exists (select 1 from public.profiles p where p.id = participant_a and p.is_pro = true)
 and exists (select 1 from public.profiles p where p.id = participant_b and p.is_pro = true)
);
create policy "Personal messages require Pro" on public.direct_messages
as restrictive for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_pro = true))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_pro = true));
create policy "Community posting requires Pro" on public.community_messages
as restrictive for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_pro = true));
create policy "Community editing requires Pro" on public.community_messages
as restrictive for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_pro = true))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_pro = true));
-- No crew_messages policies are changed. Free hosts/attendees retain access.
