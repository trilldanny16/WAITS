# WAITS critical fixes — independent QA

## Scope and evidence standard

User story: an authenticated member signs in, manages their account and App Store
subscription, then starts or replies to a personal conversation only when backend
Pro, participant, block and messaging-privacy rules permit it. Eligible Free
members retain workout group chat access. This document distinguishes source,
automated regression, local bundle and real-device evidence.

The full user brief and all seven supplied images were available. The Strava
images are layout references, not assets or branding to copy. No main merge,
production deployment, StoreKit transaction or physical-device screenshot is
implied by these checks.

## Independent checks completed

- Web TypeScript `tsc --noEmit`: independently rerun after the final entitlement
  refresh change; exit 0.
- Native TypeScript `tsc --noEmit`: exit 0 after the final native profile-refresh
  and billing identity changes.
- Native `scripts/test-subscription-plans.cjs`: 13 validation assertions passed.
  Covers SKU/period mapping, price validity, savings and intended-US-price mismatch.
- Native `scripts/test-billing-identity.cjs`: mocked activation retry, serialized
  account switching, stale purchase callback rejection, logout and fail-closed
  restore passed. These tests do not contact StoreKit.
- Final iOS Metro export: exit 0, 1,374 modules and 27 assets, including the approved
  clock logo and three bundled fictional portraits. Output
  `.qa-critical-ios-export-final`, bundle
  `entry-57e9d1669773b907eb897e75c783fd75.hbc`. Metro export is not a signed IPA
  or device test.
- Web `tests/adapty-webhook-event.test.cjs`: independently passed 13 payload
  cases. Cancellation is not treated as expiry; no client-supplied grant.
- Both checkouts' `git diff --check`: exit 0, existing Windows LF/CRLF warnings
  only.
- Full production Next build was not run against the active dev `.next` output
  to avoid corrupting the visible preview. A production web build and signed
  native build are still release gates; TypeScript and Metro export are not
  substitutes for those builds.
- Local `/critical-preview` and `/messaging-preview` on port 3016 independently
  returned HTTP 200. These reuse production presentation components with
  explicitly labeled fixtures, not real accounts or simulated transactions.
- Lint is not claimed: the web package declares an `eslint .` script but there
  is no installed `node_modules/.bin/eslint.cmd` runner or declared eslint
  dependency. Type checking and source review are separate evidence.

## Acceptance matrix

| Requirement | Evidence / status |
| --- | --- |
| Active billing provider | Native Adapty integration reviewed; web Stripe is separate. No RevenueCat integration observed in changed native billing files. |
| Monthly and annual selectable plans | Native paywall maps only exact SKUs and subscription periods. Unavailable products remain visible as intended-US-price, disabled; Subscribe requires a real validated store product. |
| Actual purchase prices | SDK localized product prices drive Subscribe; US USD mismatch is explicitly disclosed. Savings calculated from same-currency products. |
| Product loading issue | External configuration remains unverified; not reported fixed. Live ASC audit reported both SKUs `MISSING_METADATA` and missing review screenshots. |
| Purchase/cancellation/pending | Success, cancellation and pending handlers inspected. Actual StoreKit transactions not performed. |
| Restore | Mocked fail-closed restore and source inspection passed. Real Apple-ID restore not performed. |
| Pro synchronization/persistence | No client write to `profiles.is_pro`; authenticated profile is backend source. Native foreground refresh and web foreground/native-event bounded retries added. Final web types passed. Coordinating agent reports live rollback entitlement tests passed, no fixtures remain; live unauthenticated webhook POST returned 401. Real Adapty event delivery remains unverified. |
| Login design | Bright blue, bundled original logo on black backing, single tagline, 62px auth controls, scroll/safe-area and readable legal links inspected. Native layout not visually verified on iPhone. |
| Apple / Google / Email authentication | Existing callback paths preserved in source. Live account sign-in/sign-out/sign-in cycles not run this turn. |
| Logout/account isolation | Origin-checked native logout bridge inspected; web authenticated subtree unmounts on signed-out state; native profile requests guard account identity. Physical-device two-session cleanup still untested. |
| Unified Settings | Actual shared `AccountSettingsContainer` contains Membership, Edit Profile and Sign Out in one outer rounded section with dividers; remaining sections and navigation preserved. Source check, not phone interaction proof. |
| Messaging inbox / compose / settings / chat | Actual production components and dedicated panels inspected. Real recipients and inbox use authenticated Supabase calls, no fixture users in live paths. Fixtures limited to development preview. |
| Messaging privacy | Friends default, Everyone / No One, preference persistence and backend first-message check implemented. Coordinating agent owns live rollback regression evidence. |
| Personal DM Pro restrictions | Frontend creation/read/send/upgrade guards inspected; backend restrictive Pro policies and tests retained. Privacy does not grant Pro. |
| Free workout group chats | Existing workout/community paths retained. No destructive schema changes to those paths in messaging migration; real Free-account interaction untested. |
| Message persistence / realtime | Real database queries, subscriptions and publication configuration implemented; no live two-browser websocket delivery test performed. |
| Small/large iPhone / keyboard | Native sign-in scroll and safe-area, chat visual viewport handling inspected. Physical iPhone small/large layouts and native keyboard avoidance remain unverified. |

## Exact external blockers

1. App Store Connect group **22408717** (`WAITS Pro`) contains:
   - `com.waitsapp.waits.pro.monthly`, resource **6815426884**, intended US price
     **$9.99/month**.
   - `com.waitsapp.waits.pro.annual`, resource **6815428307**, intended US price
     **$99.99/year**.
   Subscription engineer's live audit reported both `MISSING_METADATA` and
   `reviewScreenshot: null`; review screenshots and any remaining ASC metadata
   must be completed and rechecked. Availability was reported enabled in 175
   territories including USA.
2. Adapty placement **main_paywall** (unless build environment overrides), access
   level **premium** (unless overridden), published flow mapping to both exact
   App Store SKUs, SDK app/key identity and webhook configuration require dashboard
   verification. Do not infer dashboard readiness from code or a missing-product
   error alone.
3. TestFlight sandbox: verify both products load with real localized prices;
   monthly purchase, annual purchase, pending/cancel outcomes, restore, reopening,
   account switching and backend entitlement synchronization need authorized
   actual-device runs. No successful transaction is claimed.
4. Browser/UI capture was previously unavailable because trusted Node helper
   failed. Local preview HTTP checks are not screenshots. The coordinating agent
   owns any fresh browser recovery/capture and must report only actual captures.

## Release gate

Do not label this production-complete solely from passing TypeScript, mocks or
Metro export. Resolve or explicitly retain the external product blocker; perform
live authentication, two-account messaging and iPhone purchase/layout checks before
claiming those flows verified. No automatic App Store review submission.

QA identified and the coordinating agent removed the legacy Stripe checkout
success handler's immediate local `setPremium(true)`. It now triggers bounded
authenticated server reads and shows a membership-syncing notice. Independent
final source search found no `setPremium(true)` path in the changed paywall/store;
final web TypeScript and patch whitespace checks both passed. Unexpected
entitlement-refresh exceptions now fail closed instead of leaving an unhandled
refresh rejection or treating an SDK/browser callback as a backend grant.

## Scoped implementation file summary

This is a task file list, not the entire dirty native checkout. Existing earlier
assets, onboarding changes and release files must not be swept into this task's
commit accidentally.

Web integration checkout:

- `components/onboarding.tsx`: shared sign-in brand/legal composition, original
  asset, blue background, tagline, scroll and consistent auth controls.
- `components/screens/settings-billing.tsx`: unified account container and native
  sign-out after account deletion.
- `components/screens/profile-view.tsx`: origin-scoped native logout bridge.
- `components/screens/paywall.tsx`: shared plan-card UI and honest local preview.
- `components/store.tsx`: authenticated server-owned membership refresh.
- `components/screens/chats-list.tsx`, `direct-message.tsx`, `messaging-panels.tsx`
  and `lib/messaging.ts`: focused messaging refinements on already integrated
  redesign; loading/privacy/account access behavior preserved.
- `app/api/adapty/webhook/route.ts`, `lib/adapty-webhook-event.ts`,
  `tests/adapty-webhook-event.test.cjs`: typed authenticated entitlement event
  parsing and regression cases.
- `app/critical-preview/page.tsx`, `app/critical-preview/preview.tsx`: development
  preview using shared real presentation, not deployed purchase fixtures.
- `docs/critical-fixes-qa-2026-10-08.md`: this QA record.

Native mobile checkout:

- `src/app/(auth)/sign-in.tsx`: blue sign-in layout, original bundled logo,
  unchanged Apple/Google/email callback logic, readable legal links.
- `src/app/index.tsx`: signed-out redirect, trusted native logout bridge and
  entitlement notification (no premature reload).
- `src/lib/adapty.ts`: retryable activation, serialized customer identity and
  guarded product/purchase/restore operations.
- `src/lib/subscription-plans.ts`: exact IDs, period validation, real prices,
  savings and intended-price mismatch validation.
- `src/components/AdaptyPaywallModal.tsx`: actual product cards and purchase states.
- `src/providers/AuthProvider.tsx`, `src/app/_layout.tsx`: SDK customer binding,
  account-aware profile reload and retry-safe initialization.
- `scripts/test-subscription-plans.cjs`, `scripts/test-billing-identity.cjs`:
  local plan and mocked customer-isolation regression tests.
- `SUBSCRIPTION-AUDIT-2026-10-08.md`: product/provider blocker evidence.

Generated `.qa-critical-ios-export*`, `.next` and TypeScript build-info files are
QA output, not task source artifacts to deploy or commit.
