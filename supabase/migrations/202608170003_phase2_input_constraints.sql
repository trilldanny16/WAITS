-- Phase 2: enforce input and path limits at the database boundary.

begin;

alter table public.community_messages
  add constraint community_messages_text_valid
  check (char_length(btrim(text)) between 1 and 1000);

alter table public.crew_messages
  add constraint crew_messages_text_valid
  check (char_length(btrim(text)) between 1 and 1000);

alter table public.profiles
  add constraint profiles_display_name_length
  check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  add constraint profiles_home_gym_length
  check (home_gym is null or char_length(home_gym) <= 120),
  add constraint profiles_city_length
  check (city is null or char_length(city) <= 100),
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 500),
  add constraint profiles_favorite_split_length
  check (favorite_split is null or char_length(favorite_split) <= 80),
  add constraint profiles_avatar_path_length
  check (
    avatar_path is null
    or (
      char_length(avatar_path) between 1 and 500
      and avatar_path !~ '[[:cntrl:]]'
    )
  );

alter table public.workouts
  add constraint workouts_gym_length
  check (char_length(btrim(gym)) between 1 and 120),
  add constraint workouts_city_length
  check (city is null or char_length(city) <= 100),
  add constraint workouts_address_length
  check (address is null or char_length(address) <= 200),
  add constraint workouts_notes_length
  check (notes is null or char_length(notes) <= 1000),
  add constraint workouts_types_count
  check (coalesce(array_length(workout_types, 1), 0) between 1 and 10),
  add constraint workouts_coordinates_valid
  check (
    (lat is null and lng is null)
    or (lat between -90 and 90 and lng between -180 and 180)
  );

alter table public.profile_photos
  add constraint profile_photos_storage_path_valid
  check (
    char_length(storage_path) between 1 and 500
    and storage_path !~ '(^|/)\.\.(/|$)'
    and storage_path !~ '[[:cntrl:]]'
  );

commit;
