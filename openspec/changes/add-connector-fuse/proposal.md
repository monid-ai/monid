# Proposal: add-connector-fuse

## Why

Fuse (fuseai.com) is B2B people and company data for prospecting. It adds a
path through the catalog that an agent doing outbound work walks end to end:
size a market for free, list the people or companies in it, then pay only
for the contact details it actually finds.

- **Free sizing and vocabularies.** People and company counts, the accepted
  values of every search filter, and a company resolver (name, domain or
  LinkedIn page to domain, LinkedIn page and logo) cost nothing.
- **Plain-English search.** Both searches and both counts take a sentence
  ("VPs of sales at fintech companies in New York") as well as filters, and
  echo the filters they built so the agent can page or refine them.
- **Lookups charged on find.** Work email and phone lookups charge only when
  a value is found, a bulk job does the same for up to 100 people, and email
  verification charges every verdict but `unknown`.

It fits the connector standard without stretching it: one base URL, one key,
a published OpenAPI document, and Fuse's own receipt, `creditsCharged`, on
every billed answer.

## What Changes

- **connectors/fuse**: 11 endpoints against
  `https://api.tryfuse.ai/api/v1/business`, the key sent raw as
  `Authorization: Basic af_…` (an inline inject, the opoint posture), one
  credit pool (Fuse credits), a provider-level `output.fromError`, and no
  provider lifecycle.
  - 8 sync: people search, company search, the two filter-value reads, the
    company resolver, the email and phone lookups, email verification.
  - 3 async, each with its own lifecycle. Each count answers
    `202 pending` with the filters it is counting, and the same request
    with those filters answers `200 ready`. The bulk job answers `202` with
    a `jobId` and is read back until `completed`, `stopped` or `failed`.
    The job read is not a catalog endpoint: the engine drives every poll
    inside the run.
- **The receipt is the evidence.** The lookups, the verification and the
  bulk job are leaf `PER_UNIT` in `CREDIT` units. Provider-level
  `usage.evidence` reads `creditsCharged` as the count and provider-level
  `usage.consolidate` claims it and plucks it out of the payload. It has to
  be the evidence and not only the claim: the engine prunes a zero claim
  and falls back to the derived fold, and Fuse's zero receipts (a miss, an
  `unknown` verdict) are real answers.
- **The searches count rows.** Fuse debits 1 credit per row returned and
  the search answers carry no receipt, so each search is a leaf `PER_UNIT`
  in `RESULT` units whose evidence counts the rows.
- **Rates live only in the estimates**, read from the usage plan of the key
  Fuse issues to the platform (`GET /business/data/pricing`, 2026-10-29):
  5 per email found, 10 per phone found, 1 per verdict, 1 per search row.
  The bulk job's ceiling is every person found on every kind asked.
- **Retries converge.** The bulk submit carries
  `X-Idempotency-Key: {runId}:submit`; Fuse binds the key to the body and
  answers a repeat with the job it already started. A count repeat or a
  job read answering `429` (and, for the job, `408` or any `5xx`)
  holds the run open on `Retry-After`, because the work keeps running on
  Fuse's side.
- **Inputs mirror the published OpenAPI**, strict like the API. The people
  (37 fields) and company (26 fields) filter vocabularies are generated
  from Fuse's document into `connectors/fuse/schema/`, shared by each
  search and its count. "Exactly one of `filters` or `query`" and "at
  least one identifier" are unions of required arms.
- **Broker-shaped choices.** Saved-search sources are not exposed, and the
  fields describing the Fuse workspace that holds the key (`savedProfile`,
  `savedBy`, `linkedinConnectedAccountIds`,
  `linkedinInvitationSentAccountIds`, `isSaved`) are dropped from rows: on
  a broker that workspace is shared by every caller and never describes
  one of them. Filter-value answers lose the `autocomplete` pointers to a
  route this connector does not carry.
- 28 fixture chains (13 recorded against Fuse's production API, 15
  synthetic) and 56 replay and wire tests, plus a gated live test per
  endpoint.

## Capabilities

- `fuse-connector`.

## Non-goals

- **`GET /data/pricing` is held back.** It answers in Fuse credits for the
  platform's own key, a price no caller here pays; the estimates carry the
  same numbers.
- **Workspace surfaces are held back**: saved searches, lists, contacts,
  campaigns, exports and agents read and write the one Fuse workspace that
  holds the key.
- **Autocomplete is held back** for now. The filter descriptions point at
  the two filter-value endpoints instead.
- **No cancel route.** Fuse has no route to cancel a bulk job, so a stopped
  run leaves the job running on Fuse's side; it finishes and charges the
  rows it finds.
- No new category leaf: `people-enrichment` and `company-enrichment` exist.
- No dollar conversion in the doc: the pool is Fuse's own credits and the
  conversion stays the broker card's job.

## Impact

New connector tree. No new `Unit`, preset, hook, category or compiler
change, and no engine bump. `connectors/ids.lock.json` gains the 11 ids.
The `/data/` routes answer only for a key carrying a Fuse usage plan, which
the platform's key does; any other key gets `403 API_NOT_ON_PLAN` on them.
The 13 normal answers are recorded against that key; the 15 fixtures still
carrying the `synthetic-` prefix are the refusals, failures and found values
that cannot be produced on demand without a real person's data.
