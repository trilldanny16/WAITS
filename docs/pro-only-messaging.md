# Pro-only messaging checkpoint
Supersedes the earlier Free DM reply policy.
- Personal DMs require both participants to be connected active Pro members. Free cannot read or send, including replies.
- Free sees no DM inbox/composer and cannot open an old DM view.
- Community remains readable; sending text/media and editing requires Pro. Own-message deletion remains available.
- Crew chats remain available to workout hosts and attendees regardless of tier.
- Existing data is preserved; no conversations/messages deleted.
- Database migration applied: 20260831171920_pro_only_personal_dms_and_community_posting.
- Rollback-only database tests passed for Free rejection, Pro pair messaging, downgrade restriction, and existing crew host/attendee/outsider tests.
- Existing security advisor warnings (public security-definer profile RPCs and leaked-password protection disabled) remain unrelated; no new findings.
- Existing previously issued signed media URLs can remain valid until their expiry; newly requested DM media access follows DM RLS.
