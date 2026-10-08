# WAITS messaging redesign — October 8, 2026

## Implementation

Development branch: `codex/profile-schedule-pro-audit`. No merge into main.
Inbox, New Message, Messaging Settings, and direct chat now share WAITS black,
charcoal, blue/green styling. Workout/community chat and Pro entitlement remain.
Real profiles and backend-authorized recipients replace the followed/demo picker.
Conversation previews, server read markers and unread counts are implemented.
An authenticated foreground heartbeat supports privacy-filtered online status.

## Applied database changes

- `20261008044649_messaging_privacy_and_presence.sql`: self-owned preferences,
  Friends default, Everyone/No One initiation, block/participant checks, durable
  first-message marker, private helper schema, presence and read markers.
- `20261008070643_messaging_realtime_updates.sql`: existing realtime publication
  was missing the DM tables; added conversations, messages and own read markers.
- Preferences govern **new conversations**. Existing conversations can continue
  after No One is selected, unless blocked or no longer entitled. Empty reserved
  conversations must recheck privacy on the first actual message.
- Existing messages/conversations were preserved. Temporary test fixtures were
  rolled back; no real account credentials were used or changed.

## Verification

Migration compiled and complete security tests passed in a rollback transaction
before applying. Tests passed again against the applied schema, including anonymous
access denial, pending vs accepted friends, Everyone/nonfriends, No One, reserved
conversation bypass, spoofed senders, blocked replies, owner isolation, private
presence, Pro restrictions and unread count clearing. Realtime publication entries
were queried and confirmed. Browser websocket delivery is not yet tested.

TypeScript and whitespace checks passed. Development-only preview serves HTTP 200
at `http://127.0.0.1:3015/messaging-preview`; fixtures do not authenticate/send/save.
Browser-control helper failed, so no visual screenshot or physical-iPhone keyboard,
navigation or two-account live UI test is claimed. New frontend is development
work, not yet published to the phone or submitted for App Store review.

Security advisors report no new messaging finding. Existing unrelated warnings:
[public profile SECURITY DEFINER RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
These were not altered under the messaging scope.

## Changed files

`components/app-shell.tsx`, `components/use-start-direct-message.ts`,
`components/screens/chats-list.tsx`, `components/screens/direct-message.tsx`,
`components/screens/messaging-panels.tsx`, shared messaging presentation components,
`lib/messaging.ts`, development-only `app/messaging-preview/`, the two migrations,
`supabase/tests/messaging_privacy.sql`, and messaging QA/handoff documents.
Unrelated dirty onboarding/privacy/lockfile/generated changes are not part of this work.
