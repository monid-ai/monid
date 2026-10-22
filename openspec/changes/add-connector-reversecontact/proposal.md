# Proposal: add-connector-reversecontact

## Why

Reverse Contact is a B2B people and company data API: it turns a work
email, a name and a company, a domain or a profile URL into a complete
professional profile, searches people and organizations with structured
filters or a plain-language prompt, and finds professional emails and phone
numbers. Those are the jobs an agent arrives with when it builds a prospect
list, enriches a CRM record, researches an account or reaches a person.

It fits the connector standard without stretching it: one base URL, bearer
auth, a published OpenAPI document
(`https://api.reversecontact.com/openapi.json`), and a receipt on every
response. `quotas.creditsConsumed` is computed by the same function the
gateway bills with, so every run settles on the vendor's own figure and
nothing is inferred from the payload.

## What Changes

- **connectors/reversecontact**: 13 endpoints against
  `https://api.reversecontact.com`, bearer auth (`rc_...` keys), one credit
  pool, a provider-level `output.fromError`, and no provider lifecycle.
  - 11 synchronous: fetch a person or a company by profile URL or id, enrich
    a person (email, or name and company) and a company (domain), People and
    Organization Search, their free counts, their prompt variants, and
    People lookalikes.
  - 2 asynchronous: the email and phone finders. The submit acknowledges a
    job; each endpoint carries a lifecycle that polls
    `GET /v2/webhooks/{webhookId}` (free upstream) until the job ends. The
    two lifecycles are byte-identical and intern to one fnTable entry.
- **The receipt is the evidence.** Every billed endpoint is a leaf
  `PER_UNIT` in `CREDIT` units at amount 1. Provider-level `usage.evidence`
  reads `quotas.creditsConsumed` and provider-level `usage.consolidate`
  claims it while plucking the whole `quotas` block out of the output. It
  has to be the evidence and not only the claim: the engine prunes a zero
  claim and falls back to the derived fold, and an empty search page is a
  real zero. The two finders override both fns to read the JOB's receipt,
  `data.creditsConsumed` on the final poll, which is net of the refund a
  miss gets; the submit's receipt never shows that refund.
- **The account's quotas never reach the caller.** Beside the receipt,
  `quotas` carries the broker account's balance, limits and ids. It is
  plucked on success and removed from `raw` on error.
- **Misses are free and arrive as non-2xx.** A profile the cached database
  does not hold, an enrichment without a match and an unknown lookalike seed
  are 404 at 0 credits upstream; validation refusals (422) and every 4xx
  other than 404 are 0 credits upstream. A finder job that ends `errored` is
  refunded upstream and settles as a provider error: `*-not-found` 404,
  `invalid-request` 400, `fetch-data-error` and unknown codes 502.
- **Budgets are measured.** Over 38,398 production email jobs (30 days to
  2026-10-21) completion took 16 s at the median, 160 s at p99 and 321 s at
  most; phone jobs never exceeded 30 s. Both finders carry a 10-minute
  `runMs` and a 5-second poll.
- **Estimates are ceilings.** 1 per fetch, 2 per enrichment, `perPage` per
  search page (the vendor's documented default of 25 is stated at the
  binding), `perPage + 1` per prompt search, 3 per email lookup, 20 per
  phone lookup.
- 21 synthetic fixture chains and 16 replay tests, plus one live test gated
  on `REVERSECONTACT_API_KEY` that runs a free count.

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

New connector tree and 13 lines in `connectors/ids.lock.json`. No new
`Unit`, preset, hook, category or compiler change, and no engine bump.
Fixtures carry the `synthetic-` prefix until they are recorded against the
provider key.
