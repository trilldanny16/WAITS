# Membership checkpoint: participant workout coordination

## Shipped
- Workout Chats are included for both Free and Pro hosts/attendees.
- Outsiders cannot access messages. Leaving removes read/send/edit access.
- Chat media authorization follows message row-level security.
- Personal DMs still require Pro to start; accepted Free connections can reply.
- Schedule privacy rules and blue Social/Chats wordmarks are unchanged.
- No deletion of messages, subscriptions, or account data.

## Verification
Database rollback-only test passed for Free attendee read/send/edit, host read, outsider read/write denial, and former-attendee read denial. No test messages were committed.
Security advisor returned no chat-policy findings. Existing warnings remain for two authenticated SECURITY DEFINER reporting functions and disabled leaked-password protection; these are not changed by this checkpoint.
Advisor guidance: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Database
Applied remote migration 20260831150905_participant_workout_chat_access.sql. No SQL needs to be pasted for the connected project.
Local Supabase CLI is unavailable; the connected migration service generated the version, mirrored in the repository.

## Not yet built
Ongoing Pro private crews, crew invitations/management, and recurring group planning are separate from these workout-specific conversations. Do not advertise these as available until implemented and tested.
Do not change the existing directional-follow model implicitly: Following currently represents accepted connections.
