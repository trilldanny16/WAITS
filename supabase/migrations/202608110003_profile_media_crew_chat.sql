Exit code: 0
Wall time: 1.4 seconds
Output:
alter table public.profiles add column if not exists avatar_path text;
insert into storage.buckets (id, name, public) values ('profile-media', 'profile-media', true) on conflict (id) do update set public = true;
create policy "Users upload own profile media" on storage.objects for insert to authenticated with check (bucket_id='profile-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users delete own profile media" on storage.objects for delete to authenticated using (bucket_id='profile-media' and owner_id=auth.uid()::text);
create policy "Profile media is readable" on storage.objects for select using (bucket_id='profile-media');

create table if not exists public.profile_photos (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, storage_path text not null unique, created_at timestamptz not null default now());
alter table public.profile_photos enable row level security;
create policy "Read profile photos" on public.profile_photos for select to authenticated using (true);
create policy "Add own profile photos" on public.profile_photos for insert to authenticated with check (user_id=auth.uid());
create policy "Delete own profile photos" on public.profile_photos for delete to authenticated using (user_id=auth.uid());

create table if not exists public.crew_messages (id uuid primary key default gen_random_uuid(), workout_id uuid not null references public.workouts(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, text text not null check (char_length(btrim(text)) between 1 and 2000), created_at timestamptz not null default now());
alter table public.crew_messages enable row level security;
create policy "Crew members read" on public.crew_messages for select to authenticated using (exists(select 1 from public.workouts w where w.id=workout_id and (w.host_id=auth.uid() or exists(select 1 from public.workout_attendees a where a.workout_id=w.id::text and a.user_id=auth.uid()))));
create policy "Crew members send" on public.crew_messages for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.workouts w where w.id=workout_id and (w.host_id=auth.uid() or exists(select 1 from public.workout_attendees a where a.workout_id=w.id::text and a.user_id=auth.uid()))));
create policy "Owners edit crew messages" on public.crew_messages for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Owners delete crew messages" on public.crew_messages for delete to authenticated using(user_id=auth.uid());
alter table public.crew_messages replica identity full;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='crew_messages') then alter publication supabase_realtime add table public.crew_messages; end if; end $$;

