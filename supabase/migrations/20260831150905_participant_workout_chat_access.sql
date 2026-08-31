-- Workout coordination is available to every participant, regardless of plan.
-- Keep RLS, ownership checks, and immutable message-field triggers.
alter policy "Crew members read messages" on public.crew_messages to authenticated using ((exists (select 1 from public.workouts w where w.id = crew_messages.workout_id and w.host_id = (select auth.uid()))
or exists (select 1 from public.workout_attendees a where a.workout_id = crew_messages.workout_id and a.user_id = (select auth.uid()))));
alter policy "Crew members send own messages" on public.crew_messages to authenticated with check (user_id = (select auth.uid()) and (exists (select 1 from public.workouts w where w.id = crew_messages.workout_id and w.host_id = (select auth.uid()))
or exists (select 1 from public.workout_attendees a where a.workout_id = crew_messages.workout_id and a.user_id = (select auth.uid()))));
alter policy "Message owners update their messages" on public.crew_messages to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (exists (select 1 from public.workouts w where w.id = crew_messages.workout_id and w.host_id = (select auth.uid()))
or exists (select 1 from public.workout_attendees a where a.workout_id = crew_messages.workout_id and a.user_id = (select auth.uid()))));
-- The message tables' own RLS decides whether a referenced upload can be read.
alter policy "Authorized users read chat media" on storage.objects to authenticated using (
  bucket_id = 'chat-media' and (
    exists (select 1 from public.community_messages m where m.media_path = objects.name and m.created_at > now() - interval '24 hours')
    or exists (select 1 from public.crew_messages m where m.media_path = objects.name)
    or exists (select 1 from public.direct_messages m where m.media_path = objects.name)
  )
);
