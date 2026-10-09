# Black sign-in, Apple subscriptions and Community Chat removal QA

## Current scope

The newer full brief replaces the blue sign-in requirement with pure black. It
preserves the original transparent logo, Apple/Google/email authentication,
personal Pro DMs and eligible workout group chats. Native Apple/Adapty billing
is the priority; existing web Stripe remains unchanged in provider and pricing.
No main merge, database data deletion, deployment, signed iOS build or StoreKit
transaction is implied by this report.

## Independent checks performed this turn

- Web `tsc --noEmit`: final independent rerun exited 0 after black sign-in,
  Community Chat removal and native-platform detection guard.
- Production Next webpack build: exit 0, compilation, TypeScript and all 15
  static pages completed. Used non-authenticating Supabase preview values and
  an inert Stripe build placeholder; this verifies compilation, not billing.
- Native `tsc --noEmit`: exit 0 after transparent-logo sign-in and personalized
  product account-binding changes.
- 13 subscription-plan regression assertions passed.
- Billing identity mocks passed: activation retry, serialized account switch,
  old-account product and purchase response rejection, logout and fail-closed
  restore. These mocks do not contact Apple or Adapty.
- 13 webhook parser cases passed; client success does not grant backend Pro and
  renewal cancellation is not immediate expiry.
- Final iOS Metro export exited 0: 1,375 modules, 27 assets, output
  `.qa-black-signin-ios-export`, bundle
  `entry-b2e957873e4931e317d5aa9bcb519934.hbc`. This is a JS/assets bundle, not an IPA.
- Exact native `WAITS_CLOCK_LOGO_XML` matches existing
  `public/waits-clock-logo.svg`: **True**. Background `<rect>` count: **0**.
  Native screen uses `#000000`, `SvgXml`, no logo frame or background motion.
- Local `/critical-preview` returned HTTP 200 on port 3016. It renders real shared
  presentation components with labeled fixtures; HTTP is not a visual screenshot.
- Actual shared web sign-in captured and visually inspected using local headless
  Edge at 390×844 and 320×568. Captures are under workspace `outputs/`:
  `waits-black-signin-web-preview.png` and
  `waits-black-signin-small-web-preview.png`. These are development browser
  captures, not native iPhone or successful authentication evidence.
- Both checkouts' final `git diff --check` exited 0, only Windows LF/CRLF warnings.
- Community source search found no live CommunityChat render, navigation overlay,
  community-message query, listener or promotion. Historical report-target type
  and generic fitness-community marketing are intentionally retained.

## Acceptance matrix

| Requirement | Evidence and remaining limit |
| --- | --- |
| Black sign-in and original logo | Exact asset equality and no background rectangle; pure-black native/web source reviewed. Real iPhone visual layout untested. |
| Auth functionality | Existing Apple/Google/email callbacks retained; native official Apple button WHITE style preserved. Live sign-in → logout → second-account login not tested this turn. |
| Safe areas and responsive layout | Native safe area, scrolling and 44px+ targets inspected; phone keyboard and small/large iPhone rendering untested. |
| No Community Chat | Entry, render, navigation and feature-only listeners/fixtures removed. No Supabase table, message, migration, storage record or historical report was deleted. |
| Personal DMs remain | `openDm`, DirectMessage render, exact participant queries, Pro guards and backend privacy rules retained. Live two-account chat untested. |
| Workout group chats remain | `openChat` and workout chat render retained, host/joined participant checks preserved. Actual eligible Free-user flow untested. |
| Monthly / annual | Exact native SKUs/period/access-level and App Store localized-price validation; unavailable plans disabled, never substituted with fake products. Device product retrieval untested. |
| Native not Stripe | Native paywall uses only returned Adapty product object; Apple manage-subscriptions bridge retained. Final web guard checks WebView bridge or WAITS-iOS UA, waits for platform before showing price, and missing native bridge shows retry rather than starting web checkout. Source and final types passed; actual iPhone interaction untested. |
| Existing web Stripe | Logical monthly plan remains $9.99; no annual/provider/schema migration introduced. Live checkout/portal transaction untested. |
| Account isolation | Personalized paywall products owned by authenticated account, cleared during switch, reloaded after busy operation; stale callbacks rejected. Mocks passed, iPhone switching untested. |
| Entitlement lifecycle | Authenticated backend profile reread; verified webhooks grant Pro, cancellation remains active until authoritative inactive event. No actual new Adapty event observed. |
| Purchase / restore | SDK initiation and success/pending/canceled/error handlers plus restore inspected. Real sandbox purchase, cancel, pending, restore and revocation untested. |

## Live provider evidence supplied by coordinating agent

These results are read-only dashboard/API audit evidence, not StoreKit retrieval:

- Adapty WAITS app **5f2c7a43-d88d-485a-8a3e-18538c8981f9** has bundle ID
  **com.waitsapp.waits**; production EAS SDK key matches the app. Secret/public
  key values were not reproduced in this document.
- Placement **main_paywall**, ID **63c3bb0f-bf0b-44b2-a58d-4b5d062f51b3**,
  has active all-users audience mapped to paywall
  **205ac4fe-dcad-4921-b673-9bf4a09b1036** containing both plans.
- Access level **premium**, ID **455eb491**, is attached to both exact products.
- Apple group **22408717** contains:
  - `com.waitsapp.waits.pro.monthly`, ID **6815426884**, intended **$9.99/month**.
  - `com.waitsapp.waits.pro.annual`, ID **6815428307**, intended **$99.99/year**.
- Both Apple products still report **MISSING_METADATA**. Review screenshot
  metadata remains the documented outstanding Apple setting; complete and
  recheck required fields before claiming availability is resolved.
- Current read-only Apple review-screenshot relationship checks returned
  `data: null` for both subscription IDs. Neither has a review screenshot.
- Live database audit reported **0 Adapty events**, **0 duplicate bindings** and
  one active existing Stripe entitlement. Existing provider RPC access remains
  server-only. No new transaction was created by QA.

## Remaining release limitations

Dashboard configuration appears correctly mapped; that does not prove StoreKit
returns both products. `noProductIDsFound` is not declared fixed. Resolve Apple
missing metadata, then use an authorized iPhone TestFlight sandbox session to
observe both real prices, purchase/restore and backend event delivery.

The existing entitlement table does not store expiration timestamps and no new
timer reconciliation was added: missed provider inactive events can leave stored
membership stale. Foreground refresh rereads server state but does not repair a
missed webhook. Verify actual inactive/revoked delivery before claiming lifecycle
verification complete.

Native signed build, real Apple/Google/email account cycles, DM/workout live
messaging and device keyboard/layout tests were not run. Initial production Next
build compiled and typechecked successfully, then stopped because this local
checkout lacked `STRIPE_SECRET_KEY`; no production credential was fabricated or
changed. A compile-only rerun supplies an explicitly inert placeholder, not a
usable Stripe key or live billing test. That rerun exited 0; all 15 static pages
and API route bundles completed.
No lint pass claimed because installed eslint runner is absent. Native paywall
capture remains unavailable here; no illustrative mockup is presented as Apple
product retrieval or sandbox purchase evidence.

## Changed source inventory for this scope

- Web `components/onboarding.tsx`, `app/critical-preview/preview.tsx`: black shared
  sign-in, original vector, white controls, minimal copy.
- Native `src/app/(auth)/sign-in.tsx`, `assets/waits-clock-logo.ts`: pure-black
  original transparent-vector composition, no image rectangle or motion.
- Web `components/screens/chats-list.tsx`, `components/app-shell.tsx`,
  `components/navigation.tsx`, `lib/seed.ts` and removed
  `components/screens/community-chat.tsx`: frontend Community Chat removal only.
- Native `src/components/AdaptyPaywallModal.tsx`,
  `scripts/test-billing-identity.cjs`: personalized product account-switch guards
  and related mocked regression.
- Web `components/screens/paywall.tsx`: native bridge/platform boundary guard,
  not a Stripe billing/provider rewrite.
- `docs/community-chat-removal-qa.md`, this QA document, and native
  `SUBSCRIPTION-VERIFICATION-SCOPE-2026-10-08.md`: evidence and limitations.

Generated export directories and TypeScript build info are verification output,
not source files to release or commit. Preserve unrelated dirty native files.
