-- Phase 1 security hardening:
-- 1. Keep profile entitlement and Stripe linkage fields server-controlled.
-- 2. Stop exposing account email addresses through the public Data API.
-- 3. Remove anonymous table privileges; authenticated access remains RLS-controlled.

revoke all privileges on table public.profiles from anon, authenticated;

grant select (
  id,
  weekly_rhythm,
  onboarding_completed,
  created_at,
  updated_at,
  display_name,
  home_gym,
  city,
  bio,
  favorite_split,
  is_pro,
  avatar_path
) on table public.profiles to authenticated;

grant insert (
  id,
  email,
  weekly_rhythm,
  onboarding_completed,
  updated_at,
  display_name,
  home_gym,
  city,
  bio,
  favorite_split,
  avatar_path
) on table public.profiles to authenticated;

grant update (
  email,
  weekly_rhythm,
  onboarding_completed,
  updated_at,
  display_name,
  home_gym,
  city,
  bio,
  favorite_split,
  avatar_path
) on table public.profiles to authenticated;

revoke all privileges on table
  public.friend_requests,
  public.community_messages,
  public.workout_attendees,
  public.workouts,
  public.profile_photos,
  public.crew_messages,
  public.workout_attendance_outcomes,
  public.workout_notifications
from anon;

alter default privileges in schema public revoke all on tables from anon;
