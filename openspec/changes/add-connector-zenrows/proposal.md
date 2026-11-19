# Proposal: add-connector-zenrows

## Why

An agent that needs the current content of a public page has to get past
the things that stop it: anti-bot protection, JavaScript that renders the
content client-side, and geo-restrictions. Doing that well is not a fetch;
it is a proxy pool, a headless browser and a policy for when to escalate
to each.

Zenrows (zenrows.com) does that behind one GET, and parses the result into
structured fields for the domains it has prepared. The catalog has
`web-scraping` and `web-extraction` leaves and several connectors in them,
but none that bills from the vendor's own per-request meter rather than
from a rate card.

Mechanically it is a small fit: one base URL, one wire path, header auth,
and an `X-Request-Credits` header on every billable response.

## What Changes

- **connectors/zenrows**: 2 endpoints against `https://api.zenrows.com/v1`,
  `X-API-Key` header auth, both on the single wire path `/`:
  - `zenrows#scrape` returns the page as Markdown (the binding's default),
    plaintext or HTML, or the fields named by CSS selectors.
  - `zenrows#extract` sends `extract=auto` and returns the fields Zenrows
    parsed out of the page, for a prepared domain.
- **Both endpoints pin `endpoint:`.** They share the wire path `/`, which
  would otherwise derive the same empty id for the pair.
- **The vendor meter is a header.** Zenrows puts the credits it charged in
  `X-Request-Credits`, not in the body. The provider declares a sync
  `lifecycle.start` relay (the ahrefs and cloro pattern) that reads the
  header into `state.data.creditsCharged`, and a provider
  `usage.consolidate` that claims it.
- **The rate is an identity.** `PER_UNIT` on `CREDIT`, 1 credit per credit,
  so the engine's derived fold equals the vendor's claim and a correctly
  metered run carries no `usage.mismatch`. Zenrows' own arithmetic is not
  restated in the doc, so it cannot drift from it.
- **The hold is the caller's own configuration.** `usage.estimate` reads
  `js_render`, `premium_proxy` and `mode` off the validated input and holds
  what the published table prices that configuration at: 1 plain, 5 with
  JavaScript rendering, 10 with Premium Proxies, 25 with both. `mode=auto`
  cannot be priced ahead and holds the 25 ceiling.
- **A missing meter falls back to the ceiling, never to zero.** When the
  header is absent or unparseable the evidence falls back to 25 and the
  consolidate omits the pool entry, so the engine settles on that derived
  fold. A stripped header must not become a free request.
- **Extract returns the fields, not the page.** `extract=auto` answers
  `{html, parsed}`. One recorded response carried 166,604 characters of
  `html` beside 2,879 bytes of `parsed`. `output.fromResponse` returns
  `parsed`; a body with no `parsed` passes through whole.
- **Errors.** Zenrows answers RFC 7807 `application/problem+json`. A
  provider `output.fromError` digests `{type, title, status, detail?,
  instance, code}` into `{message, code?, raw}`, reading `detail` first and
  `title` as the fallback, because some 400s carry no `detail`.
- **Fixtures are recordings.** All five were captured from
  `api.zenrows.com`, not authored. The first capture caught a stale
  hand-written body, so the policy earned itself immediately.
- `shared/testing/fixtures.ts`: `x-request-credits` joins
  `RECORDED_RES_HEADERS`, so a fixture may carry the meter the connector
  bills from.

## Capabilities

- `zenrows-connector`.

## Non-goals

Zenrows has three more surfaces. None is held back for being a job rather
than a request: monid runs async work perfectly well, with `lifecycle.poll`,
a `RUNNING` state and `timeouts.pollMs`, and their own cloro connector uses
it. Each is out for its own reason, and two of those reasons are about what
there is to bill from.

- **Crawl** (`/v1/crawls`) reports no usage at all. The published response
  is `crawl_id`, `status`, `url`, the `max_*` knobs, `discovery`,
  `coverage`, `duplicates_removed`, `results` and timestamps;
  `coverage` counts `pages_fetched`, `pages_failed` and `items_found`.
  There is no credits, cost or spend field anywhere in it, confirmed in the
  spec and against a completed crawl. `usage.consolidate` would have nothing
  to read, so every crawl would settle on the estimate rather than on what
  was charged. That is the silent-fallback case this connector is built to
  avoid, and it would be the normal case rather than an edge.

- **Batch** (`POST /v1/jobs` and its job tree) does report spend, at
  `latest_run.stats.spend`, and a completed one-task run reads
  `{credits: 1, cost: 0.000422}`. The spec disqualifies it as a claim: the
  field is "Indicative ... **Not billing-grade**; your account statement is
  authoritative. Use as a 'how much did this cost?' indicator, not for
  reconciliation", and the run total is "Absent on runs whose tasks predate
  this field (treat as zero)". Settling a caller's bill IS reconciliation,
  and an absent meter read as zero is the free run this connector refuses
  for Fetch. Batch belongs here once it has a meter meant to be billed from.

- **The hosted Browser** is a session, not a request. A caller opens it and
  drives it across many calls before closing it. There is no way to express
  "hold this open and let the agent steer it" as one metered endpoint, so
  this one does not fit the model rather than lacking a meter.

- **`response_type=pdf` and the screenshot parameters** are not offered on
  `zenrows#scrape`. Both need `js_render` and answer with a binary body,
  which is not Json and would need an output contract of its own.

- **No dollar conversion in the doc.** Zenrows reports `X-Request-Cost`
  beside the credits, but dollars per credit vary by plan tier: pay-as-you-go
  is \$0.50 per 1,000 credits while the monthly plans work out lower, down to
  about \$0.11. The pool is the credit a customer holds and tops up; the
  conversion is the broker card's job.

## Impact

New connector tree, 2 new ids in `connectors/ids.lock.json`, and one new
recorded response header. No new `Unit`, preset, hook or category, and no
compiler or engine change.
