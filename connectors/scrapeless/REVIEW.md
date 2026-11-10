# Reviewer notes

Scope: Google Search API, AI Scraper, Web Unlocker, Amazon Scraper and TikTok
Scraper: 22 endpoints.

## Evidence and latest branch checks

Every endpoint has a representative redacted native-success fixture indexed by
`review-cases.ts`. `review-readiness.test.ts` checks exact compiled requests,
native outputs, input errors, authentication and asynchronous failure handling.
`branches.test.ts` adds eleven new native chains, plus clearly synthetic
contract/regression branches. All protocol calls in each recording are retained;
large native arrays/strings are trimmed in fixtures, not in runtime output.

### Amazon Rufus — independent options verified

Five native requests isolate the relevant inputs:

- Same category question with `is_get_question=false/true`: true returned
  per-product `result.products[].related_questions`, while the false sample did
  not. Top-level `result.related_questions` existed in both.
- Same category question with `is_sse_data=false/true`: true added event records
  under the JSON `html` field. HTTP media type remained `application/json`. This
  is buffered event data, not a live SSE connection.
- Same product question without/with `asin=B0GN4CFF6H`: the former asked for
  product context; the latter answered specifically about Sony WH-1000XM6.

The schema and description now explain those distinctions. No local filtering,
fabricated stream, new tool or persistent conversation session is introduced.
The
[official changelog](https://www.scrapeless.com/en/blog/scrapeless-weekly-changelog-july-27-august-02-2026)
and
[product-aware guide](https://www.scrapeless.com/en/blog/amazon-rufus-product-aware)
support the parameter intent. Native samples establish representative effects,
not deterministic model wording or all regions.

### AI Mode share resolution

Public Google /search?udm=50 URL-only success remains recorded. A new prompt
generated a share URL; submitting that short URL directly failed HTTP 400.
Unauthenticated Google redirects yielded the full shared AI Mode search URL.
Submitting that exact full target with every share parameter intact succeeded
natively, without replacing it with a new prompt or just its query.

The binding now expands only known share.google/aimode links before its sole
supplier POST: at most three allowlisted bare Google reads, stopping at the
FIRST full udm=50 link. A later legacy-page redirect can remove udm=50.
Missing/foreign/cyclic/failed resolution creates no scraper task. Synthetic
placement of observed redirect headers plus the native resolved-target API
recording verifies compiled wire, no resubmission and credential withholding.
This is not a new end-to-end production Monid live claim. Historical
direct-short failures remain history, not wire expectations for the fixed
binding. Internal raw_url failures and arbitrary Google URLs are not turned into
a universal success promise.

Google batch modes are regular, images, local, video, shopping and news. These
are the six registered Google endpoints in this review batch.

## Billing and production boundaries

Declared list-rate folds are tested, not actual supplier debit receipts.
TikTok's three USD 0.003/request rates remain project-owner confirmation. Monid
zero-settles engine errors; this does not prove the supplier request was free.
Failure-cost policy, production credentials, account/rate selection, limits and
maintenance contacts belong to the later production handoff. These bindings
retrieve AI output during a run; they do not promise durable external task
storage or upstream cancellation. Documented retention is four minutes after
completion. Small samples do not establish throughput or SLA.

## Pinned-baseline auxiliary check

Official pinned PR CI runs `deno task check` and `deno task test`. The extra
`deno task ids:check` finds pre-existing unrelated drift: 78 unlocked additions
/ seven removed or renamed IDs. This package adds only Scrapeless's 22 stable
IDs; no other provider lock entry is rewritten. Disclose the auxiliary failure
and recheck latest upstream rules before any authorized PR.

## Maintenance and release

Connector maintainer: schemas, rate pins, fixtures and regression tests.
Scrapeless API owner: API contracts, service changes and supplier-side incident
support. Runtime operator: credential rotation, run budgets and durable output
retention. Named contacts remain coordination work; none are invented. No
automatic resubmission of ambiguous requests.

After explicit authorization, follow Monid's connector process: PR first, then
company **Scrapeless**, corresponding [API docs](https://docs.scrapeless.com/)
and PR URL to support@monid.ai. No outreach is performed here. Review/merge,
production catalog, Tools listing and real production acceptance are separate
milestones. Local readiness is not approval or a claim of full product coverage.
