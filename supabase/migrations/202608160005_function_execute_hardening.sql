revoke all on function public.apply_stripe_entitlement(uuid, text, text, text, boolean, bigint)
from public, anon, authenticated;
grant execute on function public.apply_stripe_entitlement(uuid, text, text, text, boolean, bigint)
to service_role;

revoke all on function public.delete_workout_attendance()
from public, anon, authenticated;
revoke all on function public.enforce_workout_attendee_capacity()
from public, anon, authenticated;
revoke all on function public.enforce_workout_host_plan_limits()
from public, anon, authenticated;
revoke all on function public.handle_new_user()
from public, anon, authenticated;
revoke all on function public.notify_followers_about_workout()
from public, anon, authenticated;

revoke all on function public.protect_community_message_fields()
from public, anon, authenticated;
revoke all on function public.protect_crew_message_fields()
from public, anon, authenticated;
revoke all on function public.protect_friend_request_identity()
from public, anon, authenticated;
revoke all on function public.protect_profile_entitlement_fields()
from public, anon, authenticated;
revoke all on function public.protect_workout_attendance_outcome_fields()
from public, anon, authenticated;
revoke all on function public.protect_workout_notification_fields()
from public, anon, authenticated;
revoke all on function public.set_community_message_created_at()
from public, anon, authenticated;

revoke all on function public.get_profile_connection_count(uuid)
from public, anon;
grant execute on function public.get_profile_connection_count(uuid)
to authenticated;

revoke all on function public.get_profile_verified_attendance(uuid)
from public, anon;
grant execute on function public.get_profile_verified_attendance(uuid)
to authenticated;

revoke all on function public.verify_workout_attendance(uuid, uuid, text)
from public, anon;
grant execute on function public.verify_workout_attendance(uuid, uuid, text)
to authenticated;