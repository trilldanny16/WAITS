# Messaging redesign QA

## Reference and scope

The supplied three reference images inform layout, not branding: centered headers,
44px minimum circular navigation controls, uncluttered inbox rows, a dedicated
recipient picker, and separate settings. WAITS keeps black, charcoal, white,
existing blue/green accents and its existing logo. Community and workout chat
entry points, media sending, and existing Pro entitlement are preserved.

Messaging privacy is distinct from profile/workout visibility and Pro access.
Accepted friendship, not a one-way follow or pending request, is the default
permission to initiate. Everyone and No One are explicit recipient preferences.
Backend checks must apply to direct database writes as well as normal UI flows.

## Initial implementation audit

- Inbox originally derived existing DMs from accepted friends, hiding persisted
  conversations with anyone outside that set. List conversations independently
  of recipient-search eligibility, while still enforcing participant access.
- Compose originally used the following list and cached `getUser` profiles.
  Search must fetch real authenticated accepted friendship rows and profiles.
- The original direct-chat screen displayed its empty state before fetching and
  lacked distinct loading/error states. Errors must not masquerade as emptiness.
- Async results and realtime events must not restore an old account's data after
  sign-out/account switch or a different conversation is opened.
- Shipping iOS uses `work/WAITS-mobile/src/app/index.tsx` and a WebView inside a
  native top/bottom SafeAreaView. The in-repository mobile tab placeholders are
  not proof of shipping messaging behavior.

## Required functional acceptance matrix

| Case | Expected outcome |
| --- | --- |
| Fresh account preferences | Friends selected; saved default in database |
| Pending/declined request or one-way follow | Cannot initiate under Friends |
| Accepted friend in either request direction | Can initiate, subject to existing membership/block rules |
| Everyone recipient, nonfriend sender | Backend permits initiation if otherwise entitled; resulting inbox conversation is retained |
| No One recipient | New inbound initiation rejected; existing authorized conversation behavior is explicit and consistent |
| Recipient changes preference | Existing records preserved; new initiation uses current saved preference |
| Block in either direction | Initiation and sends rejected; blocked presence is not disclosed |
| Forged sender / conversation participant / settings owner | Rejected at backend, not merely hidden by UI |
| Third account fetches private conversation/messages/media | No unauthorized rows or newly signed media access |
| Logout, second-account login | No first-account conversations, messages, drafts, settings, or recipient selection |
| Reload/reopen | Messages, conversation previews and settings persist |
| Failed settings save | Visible error and no false success/selected persisted state |
| Request fails/offline | Loading resolves to retryable error, never No Messages/No Friends Found |
| Realtime text/media message | Chat and inbox preview/timestamp/unread update without duplicate rows |
| Concurrent Create on two devices | One canonical conversation; both navigate to it |
| Community/workout chat | Existing participant access and media behavior remain working |

## Mobile and navigation matrix

Run on 320×568, 375×667, 390×844 and 430×932 portrait sizes, and on an actual
iPhone TestFlight build. Browser resizing alone does not verify native keyboard,
status bar, home-indicator insets, or WebView behavior.

- Inbox: centered Messages header even with two right controls; Back returns to
  the previous app location; compose and gear targets do not collide.
- Compose: X returns to inbox; search uses `Search friends`; selection is clear;
  Create stays disabled before selection, while loading and during creation.
- Settings: Back returns to inbox; radio descriptions fit/wrap; toggles and
  radios are keyboard accessible; saving/error feedback remains visible.
- Chat: Back returns to inbox; recipient/avatar/timestamps fit; long names and
  unbroken message text do not overflow; sent/received bubbles are distinct.
- Keyboard: composer and Send remain above the iOS keyboard; recent messages
  stay visible; dismissing keyboard restores full height; no extra nested scroll.
- Scrolling: chat jumps to recent messages initially/on own send without trapping
  a reader who is reviewing older messages. New-message unread state is correct.
- Accessibility: meaningful button labels, visible focus, readable contrast,
  44px targets, reduced-motion behavior, zoom/large-text wrapping.
- Empty/loading/error states are mutually exclusive and screen-reader announced.

## Evidence and limits

Initial QA is source inspection only. On 2026-10-08, browser inspection was
attempted once using `cua.getState()` and failed with `trusted Node process exited
unexpectedly; kernel reset`. No screenshot, visual alignment, physical-iPhone,
keyboard, live-account or purchase verification is implied by this document.
Record actual test commands/results and remaining issues in the release handoff.

## Implementation QA evidence

- Independent `tsc --noEmit` completed successfully after the redesigned panels
  and local preview were added. `git diff --check` completed successfully; only
  existing Windows LF/CRLF normalization warnings were reported.
- Source review confirmed separate loading/error/empty states, disabled Create
  before selection, persisted-preference errors, 44px controls, canonical inbox
  queries independent of friendship search, chat identity guards, a 1,000-character
  composer limit matching the database, long-text wrapping, near-bottom scrolling,
  and visual-viewport resize/restoration cleanup. These are code checks, not
  browser interaction or physical-device proof.
- `/messaging-preview` shows all four styles in a horizontal row and reuses actual
  inbox headers/rows/empty state, New Message, Messaging Settings, and direct-chat
  headers/bubbles/composer with clearly labeled fictional fixtures. The server returns notFound
  outside development; preview props bypass database calls/saves. This route must
  not be used as evidence of live messaging or database authorization.
- `supabase/tests/messaging_privacy.sql` supplies generated rollback-only auth
  fixtures for owner isolation, Friends/Everyone/No One, accepted versus pending
  friendship, private inbox/read markers, spoofed senders, reserved-empty-conversation
  initiation rechecks, existing replies, Pro entitlement, hidden presence and
  blocks in both directions. Execution results are recorded separately; creating
  the test file alone is not a passing backend test.
- The local preview server at `http://localhost:3015/messaging-preview` returned
  HTTP 200, including all four screen labels and the local-fixture disclosure.
  This HTTP/source check is not a screenshot or visual interaction test.

## Backend verification update

The coordinating agent reported that the rollback regression suite passed against
the staged migration, followed by additional anonymous-access, blocked-reply and
unread-marker assertions, and then applied the migration to Supabase. The initial
private-schema permission error was corrected by moving new messaging helpers to
the non-exposed `messaging_private` schema with authenticated schema usage. This
QA agent confirmed the committed test file references that namespace. Keep the
coordinating agent's execution output as the authoritative database evidence;
this is separate from the still-unverified browser and physical-phone experience.
