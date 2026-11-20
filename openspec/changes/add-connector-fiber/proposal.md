# Proposal: add-connector-fiber

## Why

Fiber AI (fiber.ai) is a B2B people and company data API built for GTM
agents: live LinkedIn profile and company fetches, person and company
resolution from loose identifiers, reverse email lookup, and contact
reveal. This adds Fiber as a provider: six synchronous endpoints behind
one `x-api-key`, billed in Fiber credits.

## What Changes

- **connectors/fiber**: 6 endpoints against `https://api.fiber.ai/v1`:
  - `linkedin-live-fetch/profile/single`: live LinkedIn profile.
  - `linkedin-live-fetch/company/single`: live LinkedIn company page.
  - `email-to-person/single`: reverse email lookup.
  - `contact-details/lite`: Fiber's lowest-priced email / phone reveal.
  - `kitchen-sink/person`: resolve a person from any mix of signals.
  - `kitchen-sink/company`: resolve a company from name, domain, or
    LinkedIn.
- **The pool is Fiber credits.** Fiber's dollar price per credit depends
  on the plan, so the conversion stays the broker card's job
  (firecrawl's posture). Pinned amounts are Fiber's platform-default
  card (`OperationPricingV2Schema` in fiber-ai/common, 2026-11):
  - live profile fetch and live company fetch: 2 credits each per call
    (`PER_CALL`).
  - reverse email lookup: 2 credits per hit. A miss is free
    (`PER_UNIT`·`RESULT`, 0 or 1).
  - lite reveal: 1 credit per email type found, plus 2 credits per
    phone (`COMPOSITE`: `email` 0-2, `phone` 0-1).
  - kitchen-sink company: 2 credits per company returned
    (`PER_UNIT`·`RESULT`).
  - kitchen-sink person: 2 credits per person returned, plus 2 more per
    person when `liveFetch` is set (`COMPOSITE`: `lookup`,
    `live_fetch`).
- **The vendor claim settles.** Every chargeable Fiber 2xx carries
  `chargeInfo.creditsCharged` in whole credits. One provider
  `consolidate` plucks the whole `chargeInfo` node. It is the claim
  (D27), and removing it also keeps `chargeInfo.lowCreditAlert`, which
  reports the shared Monid account's balance, out of caller output.
- **Billing knobs are materialized at the binding** (D25): lite
  `enrichmentType` (work on, personal off, phone off), kitchen-sink
  `numCompanies` / `numProfiles` (1), and `liveFetch` (false). These are
  Fiber's own documented defaults.
- **Synthetic fixtures.** Shapes follow Fiber's response schemas in
  fiber-ai/backend. No calls were recorded.

## Capabilities

- `fiber-connector`.

## Non-goals

- **People search and company search** (`/people-search`,
  `/company-search`): Fiber's most-used paid endpoints, but the filter
  object is large (dozens of nested filters plus exclusion lists). It
  needs its own mirror, so it gets its own change.
- **The full contact-reveal waterfall** (`/contact-details/single`,
  exhaustive, turbo, premium phone): many tiers and operations per
  call. The lite reveal is the agent-friendly entry point.
- **Async and batch surfaces** (audiences, batch live enrich, batch
  contact details, saved searches, trackers): they hold state on
  Fiber's side.
- **Lite reveal's `company` override**: a nested company-identifier
  union that only re-routes mismatched work emails. Absent means Fiber
  uses the person's own current company.
- **Account endpoints** (`get-org-credits`, `rate-limits`, top-ups):
  hosted concerns, never catalog endpoints.

## Impact

New connector tree only, plus six ids in `connectors/ids.lock.json`. No
`categories.ts` change (`people-enrichment`, `company-enrichment`, and
`linkedin` exist). No engine bump, no new `Unit`, no new preset, no
hook-ABI change.
