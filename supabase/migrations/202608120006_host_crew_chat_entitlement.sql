drop policy if exists "Crew members read messages" on public.crew_messages;
create policy "Crew members read messages"
  on public.crew_messages for select to authenticated
  using (
    exists (
      select 1
      from public.workouts workout
      where workout.id = workout_id
        and workout.host_id = auth.uid()
    )
    or (
      exists (
        select 1
        from public.workout_attendees attendee
        where attendee.workout_id = workout_id::text
          and attendee.user_id = auth.uid()
      )
      and exists (
        select 1
        from public.profiles profile
        where profile.id = auth.uid()
          and profile.is_pro = true
      )
    )
  );

drop policy if exists "Crew members send own messages" on public.crew_messages;
create policy "Crew members send own messages"
  on public.crew_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1
        from public.workouts workout
        where workout.id = workout_id
          and workout.host_id = auth.uid()
      )
      or (
        exists (
          select 1
          from public.workout_attendees attendee
          where attendee.workout_id = workout_id::text
            and attendee.user_id = auth.uid()
        )
        and exists (
          select 1
          from public.profiles profile
          where profile.id = auth.uid()
            and profile.is_pro = true
        )
      )
    )
  );
