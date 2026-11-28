# Proposal: add-connector-outbound-dev

## Why

outbound.dev is B2B lead data for agents. It is already on the hosted
catalog with ten search endpoints; this change brings it into the connector
standard and adds the four contact endpoints the hosted listing does not
have, so an agent doing outbound work can walk the whole path with one
provider: size a market for free, list the people or companies in it, then
pay only for the contact details it actually finds.

- **Unmasked search, per record.** People search, company search and the
  people at one company return full names, titles and LinkedIn URLs with no
  reveal step, at $0.001 per record returned. An empty page is free.
- **Free sizing and vocabularies.** Both counts, the accepted values of
  every filter, suggestions for the free-text filters, and a company
  resolver cost nothing.
- **Contact details charged on find.** A work email is $0.02 and a phone
  number $0.05 when outbound.dev's own data finds them, a miss is free, and
  an email verification is $0.01 per verdict with `unknown` free. A bulk
  job does the same for up to 100 people.

It fits the standard without stretching it: one base URL, one Bearer key, a
published OpenAPI document (`https://api.outbound.dev/openapi.json`) and
dollar prices published at `docs.outbound.dev/billing` and `GET /v1/prices`.

## What Changes

- **connectors/outbound-dev**: 14 endpoints against
  `https://api.outbound.dev/v1`, `presets.auth.bearer()`, one credit pool
  (US dollars), a provider-level `output.fromError`, and no provider
  lifecycle.
  - 11 answer in one request: the three searches, the two filter-value
    reads, the two suggestion reads, the company resolver, the email and
    phone lookups, email verification.
  - 3 are async, each with its own lifecycle. Each count answers
    `202 pending` with the filters it is counting, and the same request
    answers `200 ready` once counted. The bulk enrichment answers `202`
    with a job and is read back from `GET /v1/jobs/{jobId}` until its
    status leaves `running`. The job read is not a catalog endpoint: the
    engine drives every poll inside the run.
- **The ten existing ids are unchanged.** Provider `outbound-dev` and the
  native paths give the same ids the hosted listing serves today
  (`outbound-dev#people/search`, `#people/count`, `#people/filters`,
  `#people/autocomplete`, `#companies/search`, `#companies/count`,
  `#companies/filters`, `#companies/autocomplete`, `#companies/resolve`,
  `#companies/people`).
- **Four new ids.** `#people/enrich/email`, `#people/enrich/phone`,
  `#people/enrich/batch` and `#emails/verify`. The email and phone lookups
  are one native route (`POST /people/enrich`, told apart by `find`), so
  each declares its own `endpoint` (contactout's twins). The email one
  sends no `find` (the route's default); the phone one's `toRequest` states
  `find: "phone"`.
- **The pool is dollars, and every billed endpoint pins its lines** (price
  list 2026-11-26):
  - searches: leaf `PER_UNIT` in `RESULT` at 0.001, evidence counting the
    rows in `data`, estimate the page size.
  - the lookups: `COMPOSITE` of two metered lines, by who found the value
    (`email_found_package` 0.02 and `email_found_waterfall` 0.05;
    `phone_found_package` 0.05 and `phone_found_waterfall` 0.10). The
    evidence reads `found.<kind>.foundBy`: `found` holds exactly what the
    call was charged for, so a miss counts zero.
  - verification: leaf `PER_UNIT` in `RESULT` at 0.01, counting a `valid`,
    `invalid` or `risky` verdict and not `unknown`.
  - the bulk job: `COMPOSITE` of the four lookup lines. The evidence reads
    the job's own `units`, and an endpoint-level `usage.consolidate` claims
    the job's `chargedUsd` and lifts it out of the payload. A job
    outbound.dev ended at no charge counts nothing, whatever `units` it
    still lists: the engine prunes a zero claim, and the fold over those
    units would otherwise bill.
  - counts, filter values, suggestions and the resolver: `FREE`.
- **No claim on the single-request endpoints.** outbound.dev states each
  call's charge in the `X-Charged-Usd` response header. The settle envelope
  carries no headers, and reading one takes a lifecycle on every endpoint
  (cloro's posture), so those endpoints settle on the derived fold. The
  line ids are outbound.dev's own price items, so the fold is re-derivable
  from `GET /v1/prices`. Lifting the header as the claim is a possible
  follow-up.
- **Retries converge.** The email lookup, the phone lookup and the
  verification go through a single-shot `lifecycle.start` (one shared fn)
  that sends `Idempotency-Key: {runId}:call`, and the bulk submit sends
  `{runId}:submit`: outbound.dev binds the key to the body and answers a
  repeat with the first answer, so a retried start never pays twice.
  outbound.dev starts a bulk job inside the submit and can take two minutes
  over it, so the submit waits that long. A call that meets its own earlier
  attempt still being answered (`409 idempotency_in_progress`), on any of
  the four, fails the attempt instead of settling at zero beside a call
  that may yet charge. So does a bulk submit that fails on outbound.dev's
  side (`408`, any `5xx`): the job may have started, and a retry under the
  same key is answered with it. A refusal (any other `4xx`) ends the run as
  data.
- **Held runs and a cancelling stop.** A count repeat or a job read
  answering `429` (and, for the job, `408` or any `5xx`) holds the run open
  on `Retry-After`. `lifecycle.stop` posts `/v1/jobs/{jobId}/cancel`, again
  while outbound.dev refuses it, and watches the job wind down for up to
  105 seconds, so the values it found before the stop settle instead of
  being left unaccounted for. A stop call that fails in transit is caught
  and the watch goes on; a job still running or unread at the end is
  `UNRESOLVED`, never a throw, which the engine would read as nothing owed.
- **Counts keep little state.** A `filters` count repeats its own request,
  as outbound.dev documents, and keeps none. A `query` count repeats with
  the `filters` its first answer returned, never the `query`, and carries
  that answer's `unresolvedCriteria` and `closestCompanyMatches` to the
  last. The two counts share one `start` and one `poll`.
- **Inputs mirror the published OpenAPI.** Bodies are strict like the API;
  the four query schemas are stricter than it on one point, refusing an
  unknown key the API would drop unread. Search filters stay the open
  object outbound.dev publishes; the two filter-value endpoints serve the
  vocabulary. "Exactly one of `query` or `filters`" on the counts, "at
  least one identifier" on a company, and the one way a person may be named
  are unions of required arms.
- **Timeouts follow outbound.dev's own.** It waits up to two minutes on its
  data provider and still charges a call the caller gave up on, so a
  request gets 125 seconds.
- **Broker-shaped choices.** `savedSearchId`, `savedSearchName` and
  `personId` are not exposed, and `personId` is dropped from enrichment
  answers: each names a record in the outbound.dev workspace that holds the
  key, one workspace shared by every caller on a broker.
- 34 synthetic fixture chains and 80 replay and wire tests, plus a gated
  live test per endpoint.

## Capabilities

- `outbound-dev-connector`.

## Non-goals

- **Workspace surfaces are held back**: saved searches, lists, folders,
  campaigns, sending accounts, conversations and knowledge hubs read and
  write the one outbound.dev workspace that holds the key. So do
  `POST /companies/search/save` and `POST /lists/{listId}/enrich`.
- **Account reads are held back**: `/me`, `/wallet`, `/usage`, `/limits`,
  `/requests` and `/prices` describe the platform's own key.
- No new category leaf: `people-enrichment` and `company-enrichment` exist.
- No new `Unit`, preset, hook or compiler change, and no engine bump.

## Impact

New connector tree. `connectors/ids.lock.json` gains the 14 ids. Every
fixture carries the `synthetic-` prefix: they are shaped on outbound.dev's
published OpenAPI document and its production request validators, and are
to be replaced by recordings once the platform's key is used with
`deno task record`. An enrichment saves the person, with what was found, as
a contact in the workspace that holds the key. outbound.dev's rate limits
count per organization, so every caller of the platform's key shares them,
and each count poll spends one count call.
