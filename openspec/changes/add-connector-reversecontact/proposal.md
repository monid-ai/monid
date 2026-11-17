# Proposal: add-connector-reversecontact

## Why

Reverse Contact is a B2B people and company data API: it turns a work
email, a name and a company, a domain or a profile URL into a complete
professional profile, searches people and organizations with structured
filters or a plain-language prompt, and finds professional or personal
emails and phone numbers. Those are the jobs an agent arrives with when it builds a prospect
list, enriches a CRM record, researches an account or reaches a person.

It fits the connector standard without stretching it: one base URL, bearer
auth, a published OpenAPI document
(`https://api.reversecontact.com/openapi.json`), and a receipt on every
response. `quotas.creditsConsumed` is computed by the same function the
gateway bills with, so every run settles on the vendor's own figure and
nothing is inferred from the payload.

## What Changes

- **connectors/reversecontact**: 15 endpoints against
  `https://api.reversecontact.com`, bearer auth (`rc_...` keys), one credit
  pool, a provider-level `output.fromError`, and no provider lifecycle.
  - 13 synchronous: fetch a person or a company by profile URL or id, check
    for free whether either is held and how fresh it is, enrich
    a person (email, or name and company) and a company (domain), People and
    Organization Search, their free counts, their prompt variants, and
    People lookalikes.
  - 2 asynchronous: the email and phone finders. The submit acknowledges a
    job; each endpoint carries a lifecycle that long-polls
    `GET /v2/webhooks/{webhookId}?wait=20` (free upstream: the read answers
    as soon as the job ends, or after 20 s with the job still running)
    until the job ends. The two lifecycles are byte-identical and intern to
    one fnTable entry. The email finder takes `emailType` (`professional`,
    the default, `personal` or `any`).
- **The receipt is the evidence.** Every billed endpoint is a leaf
  `PER_UNIT` in `CREDIT` units at amount 1. Provider-level `usage.evidence`
  reads `quotas.creditsConsumed` and provider-level `usage.consolidate`
  claims it while plucking the whole `quotas` block out of the output. It
  has to be the evidence and not only the claim: the engine prunes a zero
  claim and falls back to the derived fold, and an empty search page is a
  real zero. The two finders override both fns to read the JOB's receipt,
  `data.creditsConsumed` on the final poll, which is net of the refund a
  miss gets and of the settlement of an email lookup: its price follows
  the emails found, not `emailType` (3 credits for a professional email, 5
  for a personal one, so an `any` lookup costs 3, 5 or 8, the 8 only when
  it finds both), and upstream settles the upfront debit when the result
  arrives. The submit's receipt never shows that settlement. On a billed
  response the evidence fn reads its receipt with `utils.json.num`: a
  billed 2xx without it fails `FN_CONTRACT` instead of settling delivered
  data at zero. Free endpoints skip that read (their evidence counts
  nothing), and `consolidate` reads the same receipt leniently
  (`optionalNum` at provider level, a type check in the finders), only to
  lift it out as the claim: failing closed is the evidence's job.
- **The account's quotas never reach the caller.** Beside the receipt,
  `quotas` carries the broker account's balance, limits and ids. It is
  plucked on success and removed from `raw` on error.
- **Misses are free and arrive as non-2xx.** A profile the cached database
  does not hold, an enrichment without a match and an unknown lookalike seed
  are 404 at 0 credits upstream; validation refusals (422) and every 4xx
  other than 404 are 0 credits upstream. A finder job that ends `errored` is
  refunded upstream and settles as a provider error: `*-not-found` 404,
  `invalid-request` 400, `fetch-data-error` and unknown codes 502. The
  free availability checks are the exception: a profile they do not hold
  is a 200 with `data.exists: false`.
- **Budgets are measured.** Over 38,398 production email jobs (30 days to
  2026-10-21) completion took 16 s at the median, 160 s at p99 and 321 s at
  most; phone jobs never exceeded 30 s. Both finders carry a 30-minute
  `runMs` (the budget of Monid's other asynchronous providers, room for a
  poll outage on top of the slowest job) and a 2-second poll cadence, the
  `Retry-After` upstream sends while a job runs.
- **A finder run never abandons a live job, and never bills it twice.**
  The job bills upstream at submit and runs on whatever the poll answers,
  so a failed read (transport, 401, 403, 408, 429, 5xx) holds the run
  open, and a job that cannot be read (404, 410) fails the run as a 502,
  not as a free miss. The submit carries `Idempotency-Key: {runId}:submit`,
  which upstream honors on both finders (the first acknowledgement replayed
  for 24 hours, `Idempotent-Replayed: true`), so a submit lost in transit
  stays a retriable `EXECUTION_FAILED` and the host's resend gets the first
  job back instead of starting a second.
- **Estimates are ceilings.** 1 per fetch, 2 per enrichment, `perPage` per
  search page (the vendor's documented default of 25 is stated at the
  binding), `perPage + 1` per prompt search, 3, 5 or 8 per email lookup
  by `emailType` (`professional`, `personal`, `any`: the most it can
  cost), 20 per phone lookup.
- 31 synthetic fixture chains and 29 tests, plus one live test gated
  on `REVERSECONTACT_API_KEY` that runs a free count.
- **Revised 2026-10-27** to the vendor's current contract: `emailType` on
  the email finder (vendor changelog v2.36.0), the long poll (v2.38.0),
  the contract-type and school filters on People Search and its count
  (v2.39.0), and the People `email` filter removed, which the vendor now
  refuses with 422 `UNKNOWN_FIELD`.
- **Revised 2026-10-28** after the maintainer's review: the two free
  availability checks (`/v2/fetch/persons/check`,
  `/v2/fetch/companies/check`) added, and every billed evidence read made
  with `utils.json.num`, so a billed 2xx without its receipt fails closed.

## Capabilities

- `reversecontact-connector`.

## Non-goals

- **The `/live` fetches** (`/v2/fetch/persons/live`,
  `/v2/fetch/companies/live`) are held back. They bill a miss (2 credits on
  a 404), which no run can settle since the engine zero-bills every non-2xx,
  and they deliver through webhooks.
- **Lists** (`/v2/lists/**`) are held back: durable workspace state. On a
  broker every caller shares one workspace, so one caller's list would be
  every caller's.
- **`GET /v2/usage`** is held back: it reports the broker account's balance,
  nothing a caller owns.
- **Withheld fields.** `issuer` (an attribution label for Reverse Contact's
  own surfaces) and the finders' `webhookUrl` (it pushes the result to a URL
  the caller names, outside the run that paid for it) are absent from every
  mirror, so the engine rejects them before the wire. The deprecated,
  ignored `fullProfile` flag of the enrichments is left out too.
- No new category leaf: `people-enrichment` and `company-enrichment` exist.
- No dollar conversion in the doc: the pool is Reverse Contact's own
  credits and the conversion stays the broker card's job.

## Impact

New connector tree and 15 lines in `connectors/ids.lock.json`. No new
`Unit`, preset, hook, category or compiler change, and no engine bump.
Fixtures carry the `synthetic-` prefix until they are recorded against the
provider key.
