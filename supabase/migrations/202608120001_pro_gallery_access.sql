-- Gallery media is private and separate from public profile avatars.
insert into storage.buckets (id, name, public)
values ('profile-gallery', 'profile-gallery', false)
on conflict (id) do update set public = false;

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profile_photos enable row level security;

drop policy if exists "Read profile photos" on public.profile_photos;
drop policy if exists "Add own profile photos" on public.profile_photos;
drop policy if exists "Delete own profile photos" on public.profile_photos;
drop policy if exists "Pro members read gallery photos" on public.profile_photos;
drop policy if exists "Pro members add own gallery photos" on public.profile_photos;
drop policy if exists "Pro members delete own gallery photos" on public.profile_photos;

create policy "Pro members read gallery photos" on public.profile_photos
  for select to authenticated
  using (exists (
    select 1 from public.profiles viewer
    where viewer.id = auth.uid() and viewer.is_pro = true
  ));

create policy "Pro members add own gallery photos" on public.profile_photos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles owner_profile
      where owner_profile.id = auth.uid() and owner_profile.is_pro = true
    )
  );

create policy "Pro members delete own gallery photos" on public.profile_photos
  for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles owner_profile
      where owner_profile.id = auth.uid() and owner_profile.is_pro = true
    )
  );

drop policy if exists "Pro members upload gallery media" on storage.objects;
drop policy if exists "Pro members read gallery media" on storage.objects;
drop policy if exists "Pro members delete own gallery media" on storage.objects;

create policy "Pro members upload gallery media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles owner_profile
      where owner_profile.id = auth.uid() and owner_profile.is_pro = true
    )
  );

create policy "Pro members read gallery media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-gallery'
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_pro = true
    )
  );

create policy "Pro members delete own gallery media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-gallery'
    and owner_id = auth.uid()::text
    and exists (
      select 1 from public.profiles owner_profile
      where owner_profile.id = auth.uid() and owner_profile.is_pro = true
    )
  );

