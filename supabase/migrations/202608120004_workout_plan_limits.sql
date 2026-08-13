create or replace function public.enforce_workout_host_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.host_id <> auth.uid() then
    raise exception 'Workout host must match the authenticated user'
      using errcode = '42501';
  end if;

  if new.max_participants > 3 and not exists (
    select 1
    from public.profiles profile
    where profile.id = new.host_id
      and profile.is_pro = true
  ) then
    raise exception 'WAITS Pro is required for more than 3 participants'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_workout_host_plan_limits on public.workouts;
create trigger enforce_workout_host_plan_limits
  before insert or update of host_id, max_participants
  on public.workouts
  for each row
  execute function public.enforce_workout_host_plan_limits();

drop policy if exists "Users host workouts within their plan" on public.workouts;
create policy "Users host workouts within their plan"
  on public.workouts for insert to authenticated
  with check (
    host_id = auth.uid()
    and (
      max_participants <= 3
      or exists (
        select 1
        from public.profiles profile
        where profile.id = auth.uid()
          and profile.is_pro = true
      )
    )
  );

drop policy if exists "Hosts update workouts within their plan" on public.workouts;
create policy "Hosts update workouts within their plan"
  on public.workouts for update to authenticated
  using (host_id = auth.uid())
  with check (
    host_id = auth.uid()
    and (
      max_participants <= 3
      or exists (
        select 1
        from public.profiles profile
        where profile.id = auth.uid()
          and profile.is_pro = true
      )
    )
  );
