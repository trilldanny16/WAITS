# General Community Chat removal

The general WAITS Community Chat is disabled in the frontend. This does not
remove personal Pro DMs or scheduled-workout group chats.

## Changes

- Removed the community inbox entry and its unused icon imports.
- Removed `openCommunity` and the community overlay from navigation.
- Removed the app-shell CommunityChat import and render path.
- Removed the now-unreachable community screen source, including its realtime
  subscription, expiry timer, uploads and community reporting controls. The
  prior implementation remains recoverable through Git history.
- Removed community-only local demonstration message fixtures and channel ID.

No Supabase table, historical message, migration, storage object, report record,
or server function was changed or deleted. The legacy `community_message`
report-target type remains for historical backend compatibility. Generic social
marketing references to a fitness community do not refer to Community Chat and
were left unchanged.

## Verification

- TypeScript `tsc --noEmit`: passed after the removal.
- Scoped `git diff --check`: passed.
- Frontend search: no CommunityChat screen, `openCommunity`, community message
  table query, community realtime listener, or Community Chat promotional label
  remains in app/components/lib; only the inert historical report-target type.
- Source regression assertions: personal DM render/navigation and Pro gating,
  workout chat render/navigation and host/joined access checks remain intact.
- Store audit: no community-specific auto-creation, subscription or notification
  behavior existed outside the removed screen. No Store changes were required.

These are source/type checks, not a claim of two-account live messaging, native
iPhone testing, sandbox purchases or deployment. Final browser/build QA is
performed separately by the coordinating agent.
