# Pro-only messaging checkpoint
Supersedes the earlier Free DM reply policy.
- Personal DMs require both participants to be connected active Pro members. Free cannot read or send, including replies.
- Free sees no DM inbox/composer and cannot open an old DM view.
- Community reading, posting text/photos, and editing own messages are available to Free and Pro.
- Crew chats remain available to workout hosts and attendees regardless of tier.
- Existing data is preserved; no conversations/messages deleted.
- Community restored by migration 20260831173655_restore_free_community_posting.
- Initial database migration applied: 20260831171920_pro_only_personal_dms_and_community_posting.
- Rollback-only database tests passed for Free DM rejection, Free Community posting/editing, Pro pair messaging, downgrade restriction, and existing crew host/attendee/outsider tests.
- Existing security advisor warnings (public security-definer profile RPCs and leaked-password protection disabled) remain unrelated; no new findings.
- Existing previously issued signed media URLs can remain valid until their expiry; newly requested DM media access follows DM RLS.
