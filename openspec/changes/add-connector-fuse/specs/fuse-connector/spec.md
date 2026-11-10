# fuse-connector (delta)

## ADDED Requirements

### Requirement: Fuse provider definition
The fuse provider SHALL declare name `fuse`, `request.baseUrl`
`https://api.tryfuse.ai/api/v1/business`, an inline `auth.inject` sending
`Authorization: Basic <apiKey>` with the raw key, and the single credit pool
`default` ("Fuse credits"). It SHALL declare a provider-level
`output.fromError` that digests `{error: {code, message, param}}` into
`{message, code?, param?, raw}`. It SHALL NOT declare a lifecycle, because
eight of its endpoints are plain synchronous requests and a provider-level
`start` would replace their declarative execution.

#### Scenario: The key travels raw
- **WHEN** any endpoint sends a request with the key `af_TESTKEY0123456789`
- **THEN** its `Authorization` header is `Basic af_TESTKEY0123456789`

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives `429` `{error: {code: "RATE_LIMITED", ...}}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output carries `code` and `message` beside the raw envelope

### Requirement: Fuse's receipt settles every billed lookup
The email lookup, the phone lookup, email verification and the bulk job
SHALL each price a leaf `PER_UNIT` in `CREDIT` units at amount 1. The
provider SHALL declare `usage.evidence` reading `creditsCharged` as that
count and `usage.consolidate` claiming the same figure while plucking
`creditsCharged` out of the output. Rates SHALL appear only in
`usage.estimate`.

#### Scenario: A find settles its price
- **WHEN** an email lookup answers `found` with `creditsCharged: 5`
- **THEN** usage is `{credits: {default: 5}, evidence: {CREDIT: 5}}` and
  `creditsCharged` is absent from the output

#### Scenario: A miss settles zero
- **WHEN** an email lookup answers `not_found` with `creditsCharged: 0`
- **THEN** usage is `{credits: {}, evidence: {CREDIT: 0}}`

### Requirement: Searches bill the rows they return
`fuse#prospects/search` and `fuse#companies/search` SHALL each price a leaf
`PER_UNIT` in `RESULT` units at amount 1, with evidence counting the
returned `profiles` or `companies`, and estimate the page size: `size`,
defaulting to 10 for people and 25 for companies.

#### Scenario: A page of two rows bills two
- **WHEN** a search page returns two rows
- **THEN** usage is `{credits: {default: 2}, evidence: {RESULT: 2}}`

### Requirement: One run returns a finished people count
`fuse#data/people/count` SHALL repeat the request with the `filters` of a
`202 pending` answer until it answers `200 ready`, and SHALL carry a
`query` count's `unresolvedCriteria` and `closestCompanyMatches` from the
first answer to the final output. A repeat answering `429` SHALL hold the
run open; any other non-2xx SHALL end it as data.

#### Scenario: A new query count
- **WHEN** a `query` count answers `202`, `202`, then `200 ready`
- **THEN** the output carries the total and the first answer's
  `unresolvedCriteria`

### Requirement: One run returns a finished company count
`fuse#data/companies/count` SHALL repeat the request with the `filters` of a
`202 pending` answer until it answers `200 ready`, and SHALL carry a
`query` count's `unresolvedCriteria` from the first answer to the final
output. A repeat answering `429` SHALL hold the run open; any other non-2xx,
including the `503` of a count that failed, SHALL end it as data.

#### Scenario: A new query company count
- **WHEN** a `query` count answers `202`, `202`, then `200 ready`
- **THEN** every repeat sends the first answer's `filters`, never the
  `query`, and the output carries the total and the first answer's
  `unresolvedCriteria`

### Requirement: One run returns a finished bulk job
`fuse#data/people/enrich-jobs` SHALL submit with
`X-Idempotency-Key: {runId}:submit`, read
`GET /data/people/enrich-jobs/{jobId}` until the job is `completed`,
`stopped` or `failed`, hold the run open on a read answering `408`, `429`
or any `5xx`, and settle on the job's `creditsCharged`.

#### Scenario: A job stopped for credits
- **WHEN** a job reads `stopped` with `stoppedReason: INSUFFICIENT_CREDITS`
  and `creditsCharged: 5`
- **THEN** usage is `{credits: {default: 5}, evidence: {CREDIT: 5}}` and the
  rows it finished are in the output

### Requirement: Inputs mirror the published OpenAPI
Every input schema SHALL mirror Fuse's published request with optionality
only and SHALL be strict, as the API is. "Exactly one of `filters` or
`query`" SHALL be a union whose arms each require one field and omit the
other, and "a `linkedinUrl`, or a `name` with a company" SHALL be a union of
three required arms. Saved-search sources SHALL NOT be exposed.

#### Scenario: Two sources at once
- **WHEN** a count or a company search is sent both `filters` and `query`
- **THEN** the run fails `INVALID_INPUT` before any request

### Requirement: Rows carry nothing about the broker's workspace
The searches SHALL drop `savedProfile`, `savedBy`,
`linkedinConnectedAccountIds`, `linkedinInvitationSentAccountIds` and
`isSaved` from their rows, and the filter-value endpoints SHALL drop
`autocomplete` pointers.

#### Scenario: A people search row
- **WHEN** a people search returns rows carrying `savedProfile`
- **THEN** no row in the output carries any of the four workspace fields
