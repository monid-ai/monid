# outbound-dev-connector (delta)

## ADDED Requirements

### Requirement: outbound.dev provider definition
The outbound-dev provider SHALL declare name `outbound-dev`,
`request.baseUrl` `https://api.outbound.dev/v1`, `presets.auth.bearer()` as
its `auth.inject`, and the single credit pool `default` ("US dollars"). It
SHALL declare a provider-level `output.fromError` that digests
`{error: {code, message, param}}` into `{message, code?, param?, raw}`. It
SHALL NOT declare a lifecycle: a provider-level `start` would replace
declarative execution on the eight endpoints that need none.

#### Scenario: The key travels as a Bearer token
- **WHEN** any endpoint sends a request with the key `ob_live_TESTKEY`
- **THEN** its `Authorization` header is `Bearer ob_live_TESTKEY`

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives `422`
  `{error: {code: "validation_failed", param: "filters", ...}}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output carries `code`, `message` and `param` beside the raw
  envelope

#### Scenario: A refusal with no envelope still digests
- **WHEN** an endpoint receives `429` `{}` or `500` `{}`
- **THEN** the output is `{message: "outbound.dev API error", raw}` and
  usage is `{credits: {}, evidence: {}}`

### Requirement: The hosted listing's ids are kept
The ten endpoints the hosted catalog already serves SHALL keep their ids:
`outbound-dev#people/search`, `outbound-dev#people/count`,
`outbound-dev#people/filters`, `outbound-dev#people/autocomplete`,
`outbound-dev#companies/search`, `outbound-dev#companies/count`,
`outbound-dev#companies/filters`, `outbound-dev#companies/autocomplete`,
`outbound-dev#companies/resolve` and `outbound-dev#companies/people`.

#### Scenario: The id set
- **WHEN** the catalog is compiled
- **THEN** the provider has exactly those ten ids plus
  `outbound-dev#people/enrich/email`, `outbound-dev#people/enrich/phone`,
  `outbound-dev#people/enrich/batch` and `outbound-dev#emails/verify`

### Requirement: Searches bill the rows they return
`outbound-dev#people/search`, `outbound-dev#companies/search` and
`outbound-dev#companies/people` SHALL each price a leaf `PER_UNIT` in
`RESULT` units at 0.001 dollars, with evidence counting the rows in `data`,
and estimate the page size: `limit`, defaulting to 10, 25 and 10.

#### Scenario: A page of two rows bills two
- **WHEN** a search page returns two rows
- **THEN** usage is `{credits: {default: 0.002}, evidence: {RESULT: 2}}`

#### Scenario: A company nothing matches is free
- **WHEN** `outbound-dev#companies/people` answers `200` with
  `status: "not_found"` and an empty `data`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}` and
  `isProviderError` is false

### Requirement: One enrichment route, two lookup endpoints
`outbound-dev#people/enrich/email` and `outbound-dev#people/enrich/phone`
SHALL both send `POST /people/enrich`. The email endpoint SHALL send no
`find`; the phone endpoint SHALL add `find: "phone"` in `input.toRequest`.
Neither SHALL accept `find` or `personId` from the caller. Both SHALL drop
`personId` from the output. Both, and `outbound-dev#emails/verify`, SHALL
send their one request from a single-shot `lifecycle.start` carrying
`Idempotency-Key: {runId}:call`, one fn shared by the three.

#### Scenario: The phone lookup states its kind
- **WHEN** the phone endpoint is called with a `linkedinUrl`
- **THEN** the request body is that `linkedinUrl` with `find: "phone"`

#### Scenario: A retried start does not pay twice
- **WHEN** a lookup's start is sent twice for one run
- **THEN** both requests carry the same `Idempotency-Key`

### Requirement: A lookup bills what `found` holds, by who found it
Each lookup SHALL price a `COMPOSITE` of two metered lines: for an email
`email_found_package` at 0.02 and `email_found_waterfall` at 0.05; for a
phone number `phone_found_package` at 0.05 and `phone_found_waterfall` at
0.10. Evidence SHALL read `found.<kind>.foundBy`. The estimate SHALL be one
value on the waterfall line when `providers` is `waterfall`, else on the
package line.

#### Scenario: A package find
- **WHEN** an email lookup answers `found.email.foundBy: "package"`
- **THEN** usage is `{credits: {default: 0.02}, evidence:
  {email_found_package: 1, email_found_waterfall: 0}}`

#### Scenario: A miss
- **WHEN** a lookup answers with an empty `found`
- **THEN** usage carries no credits and both lines count zero

#### Scenario: Listed is not charged
- **WHEN** a lookup answers an address in `emails` and an empty `found`
- **THEN** usage carries no credits: the evidence reads `found` alone

### Requirement: Verification bills a verdict
`outbound-dev#emails/verify` SHALL price a leaf `PER_UNIT` in `RESULT`
units at 0.01 dollars, with evidence counting 1 for `valid`, `invalid` or
`risky` and 0 for `unknown`.

#### Scenario: An unknown verdict is free
- **WHEN** a verification answers `status: "unknown"`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

### Requirement: One run returns a finished count
`outbound-dev#people/count` and `outbound-dev#companies/count` SHALL repeat
a `202 pending` request until it answers `200 ready`. A `filters` count
SHALL repeat its own request and keep no state. A `query` count SHALL
repeat with the `filters` its first answer returned, never the `query`,
and SHALL carry that answer's `unresolvedCriteria` and
`closestCompanyMatches` to the final output. A repeat answering `429` SHALL
hold the run open; any other non-2xx SHALL end it as data. Both SHALL be
`FREE`, and SHALL share one `start` and one `poll`.

#### Scenario: A new query count
- **WHEN** a `query` count answers `202`, `202`, then `200 ready`
- **THEN** the output carries the total and the first answer's
  `unresolvedCriteria`, and the repeats sent the returned `filters`, never
  the `query`

### Requirement: One run returns a finished bulk enrichment
`outbound-dev#people/enrich/batch` SHALL submit with
`Idempotency-Key: {runId}:submit`, waiting 125 seconds for the answer, then
read `GET /v1/jobs/{jobId}` until the job's `status` is no longer
`running`. A submit answering `409` `idempotency_in_progress` SHALL fail
the attempt, not end the run. A read answering `408`, `429` or any `5xx`
SHALL hold the run open. It SHALL price a `COMPOSITE` of the four lookup
lines, with evidence reading the job's `units` and `usage.consolidate`
claiming `chargedUsd` and removing it from the output. Evidence SHALL count
nothing when `chargedUsd` is zero.

#### Scenario: A finished job
- **WHEN** a job ends `succeeded` with `units`
  `[{email_found_package: 1}, {phone_found_waterfall: 1}]` and
  `chargedUsd: "0.120000"`
- **THEN** usage credits are `{default: 0.12}` and `chargedUsd` is absent
  from the output

#### Scenario: A failed job settles what it found
- **WHEN** a job ends `failed` after finding one email from the package
- **THEN** usage credits are `{default: 0.02}`

#### Scenario: A job ended at no charge
- **WHEN** a job ends `failed` with `chargedUsd: "0.000000"` while its
  `units` still list three emails
- **THEN** usage carries no credits and every line counts zero

#### Scenario: A stopped run cancels the job
- **WHEN** the run is stopped while the job is `running`
- **THEN** the engine posts `/v1/jobs/{jobId}/cancel`, again while it is
  refused, reads the job up to eight times 15 seconds apart, and settles on
  the job once it has left `running`; a job still running after that is
  `UNRESOLVED`
