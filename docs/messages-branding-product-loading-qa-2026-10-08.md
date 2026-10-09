# Messages branding and persistent Apple product-loading QA

## Status vocabulary

- **Verified Working**: directly inspected or executed evidence for the stated
  boundary; not automatically proof of a physical iPhone flow.
- **Code Fixed—Awaiting Device**: source/automated checks passed, native runtime
  still needs observation.
- **Blocked External**: identified external setting prevents release readiness.
- **Not Verified**: evidence unavailable; do not infer success from absence of errors.

## Messages acceptance

| Check | Status | Evidence |
| --- | --- | --- |
| Title is Messages, not Social/Profile/WAITS | Verified Working | Actual shared Messages header source and local browser screenshots. Profile remains Profile; social list remains Followers/Following. |
| Branded blue title / original logo | Verified Working | Header uses existing primary token, uppercase 18px black-weight tracking .06; exact original `/waits-clock-logo.svg` image, not substitute Clock/Dumbbell art. |
| Header fit at small width | Verified Working | QA initially caught 320px preview title clipped by controls. UI agent moved title to full second row; final capture shows no clipping at 320px/390px. |
| Back, Compose, Settings targets | Verified Working | Local DOM measured all three navigation controls at least 44×44px at both widths. |
| Native Messages header | Code Fixed—Awaiting Device | WebView presentation component is fixed; latest header has not been observed on physical iPhone. |
| Real message send/persistence | Not Verified | This turn's capture uses disclosed fictional development fixtures, not signed-in conversations. Existing backend authorization tests are separate evidence. |

Actual shared-component captures, visually inspected:

- Workspace `outputs/waits-branded-messages-web-preview-390.png`.
- Workspace `outputs/waits-branded-messages-web-preview-320.png`.

These are local headless Edge development screenshots, not iPhone screenshots.
Fixture avatars, unread markers and messages must not be described as real users.

## Subscription evidence boundary

`noProductIDsFound` is still not declared fixed. Configuration catalog inspection,
type checks and mocked responses do not prove `getPaywallProducts` returns actual
StoreKit products on an iPhone. The coordinating agent owns the current live
Apple/Adapty read-only audit; no dashboard writes or purchases are performed by QA.

| Required configuration / flow | Status | Evidence or precise limitation |
| --- | --- | --- |
| Bundle ID `com.waitsapp.waits` | Verified Working | Earlier same-day live app catalog/EAS audit; current audit recheck owned by coordinator. |
| Apple app ID `6811923395` | Verified Working | Earlier read-only Apple API relationship audit. |
| Monthly SKU `com.waitsapp.waits.pro.monthly` | Verified Working | Exact source mapping and earlier Apple/Adapty catalog audit; resource 6815426884. |
| Annual SKU `com.waitsapp.waits.pro.annual` | Verified Working | Exact source mapping and earlier Apple/Adapty catalog audit; resource 6815428307. |
| Intended US prices $9.99 / $99.99 | Verified Working | Earlier Apple price-point audit and plan tests. This is not device-localized retrieval evidence. |
| Subscription group 22408717 | Verified Working | Earlier live Apple relationship audit; Monthly level1/Annual level2 still requires owner review for same-tier offering. |
| US availability | Verified Working | Earlier Apple catalog audit included USA within175 territories; contractual eligibility remains separate. |
| Placement `main_paywall` | Verified Working | Earlier live Adapty active all-users audience audit; current refresh owned by coordinator. |
| Paywall205ac4fe-dcad-4921-b673-9bf4a09b1036 | Verified Working | Earlier live catalog links both exact SKUs. Dashboard list is not native SDK delivery. |
| Access level `premium` | Verified Working | Earlier live catalog both products linked; source rejects wrong access level. |
| Production public SDK key/app match | Verified Working | Coordinator inspected the exact build-66 IPA: embedded public key matches live WAITS Adapty app, bundle com.waitsapp.waits/build66 and both product IDs/placement/access-level strings present. No key printed. Static artifact matching is not runtime retrieval proof. |
| Adapty linked numeric Apple app ID / credential health | Not Verified | CLI confirms bundle ID, not numeric Apple app linkage or IAP credential health; authenticated dashboard UI unavailable. |
| SDK implementation | Code Fixed—Awaiting Device | getFlow→getPaywallProducts→makePurchase exact returned product, account guards, retry/restore validated by source and mocks. |
| Apple metadata / review screenshots | Blocked External | Earlier same-day live audit both MISSING_METADATA and review screenshot data:null; coordinator rechecking current state. |
| Paid Apps agreements / banking / tax | Not Verified | Authenticated agreement UI unavailable; product catalog availability does not establish contracts. |
| TestFlight environment | Not Verified | Build66 reported available Internal Testers; this does not prove StoreKit sandbox identity or installed SDK logs. Latest black sign-in/header edits remain local and unreleased. |
| Actual product retrieval | Not Verified | No physical iPhone SDK/StoreKit logs or returned product metadata available. |
| Purchase / cancellation / pending / errors | Not Verified | Code handles outcomes; no real sandbox transaction performed. |
| Restore / reopen entitlement | Not Verified | Mocks/source server refresh checks passed previously; Apple-ID restore and observed real webhook grant untested. |
| Revocation / expiry | Not Verified | Authoritative inactive access-level path implemented; real inactive provider event delivery unobserved. |

## Root-cause discipline

Missing Apple review screenshots/metadata are proven defects, not proof of the
sole origin of the device error. Earlier live Adapty products/paywall/placement
and key relationships were correct, so arbitrary product recreation/provider
migration is not justified. Inspect current installed-build SDK logs and check
Apple contracts/metadata, then observe actual StoreKit returned IDs. Keep unknown
items Not Verified. Obtain user approval before production dashboard corrections.

SDK1000 occurs in SDK/configuration lookup, before WAITS's returned-product filter.
Loosening SKU/period/access-level checks or changing card appearance cannot fix
that SDK error. The exact failing phone await and returned flow inventory remain
unobserved. Apple TestFlight uses sandbox; App Store review submission is not a
product-loading workaround or sandbox prerequisite.

Native billing must not fall back to Stripe. Existing web Stripe remains separate;
no new annual Stripe plan or schema rewrite is part of this task.

## This turn's executed checks

- Final web TypeScript exited0 after responsive header fix.
-13 webhook payload regression cases passed.
- Final web patch whitespace check exited0, Windows CRLF warnings only.
- Production Next webpack build exited0: compilation, TypeScript, page-data
  collection, all15 generated pages and API bundles completed. Used explicitly
  inert compile-only Supabase/Stripe values; no real billing call was tested.
- Native TypeScript rerun exited0;13 plan tests and mocked billing identity tests
  passed (including stale personalized-product rejection). Native runtime files
  did not change this turn; previous iOS Metro export remains separate evidence,
  not a newly signed build or device-product test.
- Local Messages preview screenshot capture at390px and320px succeeded; all
  navigation controls measured44px minimum, final images visually inspected.

No current-turn native signed build, deployment, main change, table/data deletion,
actual login, product-loading or transaction success is claimed. Native diagnostic
tests/export status is appended after the billing agent finishes.
