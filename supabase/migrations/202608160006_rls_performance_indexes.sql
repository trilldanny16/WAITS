drop policy if exists "Users can read their own profile"
on public.profiles;
drop policy if exists "Users can update own profile"
on public.profiles;

create index if not exists community_messages_user_id_idx
on public.community_messages(user_id);

create index if not exists crew_messages_user_id_idx
on public.crew_messages(user_id);

create index if not exists friend_requests_sender_id_idx
on public.friend_requests(sender_id);

create index if not exists friend_requests_receiver_id_idx
on public.friend_requests(receiver_id);

create index if not exists profile_photos_user_id_idx
on public.profile_photos(user_id);

create index if not exists workout_attendance_outcomes_verified_by_idx
on public.workout_attendance_outcomes(verified_by);

create index if not exists workout_notifications_actor_id_idx
on public.workout_notifications(actor_id);

create index if not exists workout_notifications_workout_id_idx
on public.workout_notifications(workout_id);

create index if not exists workout_notifications_unread_recipient_idx
on public.workout_notifications(recipient_id, created_at)
where read_at is null;