# specstream-connector (delta)

## ADDED Requirements

### Requirement: SpecStream provider definition
The specstream provider SHALL declare name `specstream`,
`request.baseUrl` `https://api.specstream.ai`, auth
`presets.auth.bearer()`, timeouts 60 s / 65 s, one credit pool `default`
("US dollars"), a provider-level `usage.model` of `FREE`, and an
`output.fromError` that maps the vendor envelope
`{ error: { code, message } }` to `{ message, code, raw }`.

#### Scenario: A refused key is data, zero usage
- **WHEN** an endpoint is called with a missing or invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and the output carries the vendor
  `message` and `code`

### Requirement: Four endpoints
The connector SHALL provide `POST /v1/parse` (`specstream#v1/parse`),
`POST /v1/capacity/quotes` (`specstream#v1/capacity/quotes`),
`POST /v1/capacity/executions` (`specstream#v1/capacity/executions`) and
`GET /v1/finds/{id}/rows` (`specstream#v1/finds/{id}/rows`), all in
category `web-search`.

#### Scenario: Reading and pricing never spend
- **WHEN** `v1/parse` returns a runnable reading, or `v1/capacity/quotes`
  returns a quote
- **THEN** usage is `{credits: {}, evidence: {}}`

#### Scenario: Reading rows never spends
- **WHEN** `GET /v1/finds/{id}/rows` returns a settled page whose
  `commerce.amount_captured_cents` is 35
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** every cell still carries the `source_url` and `observed_at` of
  the page it was read from

### Requirement: Input gates
`v1/parse` SHALL require `q` (1 to 16000 characters) and accept an
optional `locale` of the form `xx-XX`. `v1/capacity/quotes` SHALL require
`ast_hash` (64 lowercase hex characters), accept `requested_units`
(1 to 10000, default 25) and `minimum_units`. `v1/capacity/executions`
SHALL require `quote_id`, `quote_hash` (64 hex characters),
`idempotency_key` (8 to 128 characters) and `confirm_max_cents` (an
integer, at least 0), and accept `authority_id`. `v1/finds/{id}/rows`
SHALL require the path parameter `id` and accept `cursor` and `limit`
(1 to 100).

#### Scenario: The gates reject near-twins
- **WHEN** `idempotency_key` has 7 characters, `quote_hash` has 63, or
  `confirm_max_cents` is -1 or 1.5
- **THEN** the call is rejected with INVALID_INPUT
- **AND** an 8 character key and `confirm_max_cents: 0` are accepted

### Requirement: The run is a durable job
`v1/capacity/executions` SHALL start by POSTing the execution and parking
RUNNING with the caller's `idempotency_key` as the job handle; poll
`GET /v1/capacity/requests/{idempotency_key}/rows`; and stop by
cancelling the find. The run SHALL complete only when `done` is true and
`commerce.settlement_status` is not `pending`. A lookup that answers 408,
429 or any 5xx status SHALL keep the run alive. A submit answered
with a non-2xx status SHALL complete as data without starting a job.

#### Scenario: A running find, then a pending charge, then a settled page
- **WHEN** the poll reads `done: false` with `retry_after_seconds: 5`,
  then `done: true` with `settlement_status: "pending"`, then a settled
  page
- **THEN** the first two ticks return RUNNING (the first with
  `pollAfterMs` 5000) and the third returns COMPLETED

#### Scenario: A failed status lookup keeps the find alive
- **WHEN** the lookup answers 503 and the next read is settled
- **THEN** the run completes with HTTP 200

#### Scenario: An expired quote is refused as data
- **WHEN** the submit answers 409 with an error envelope
- **THEN** the run completes as HTTP 409, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`

#### Scenario: Stop settles or stays unresolved
- **WHEN** a stopped find reads back done with a settled receipt of 20
  cents
- **THEN** the stop completes with usage `{credits: {default: 0.2},
  evidence: {CREDIT: 20}}`
- **WHEN** the charge is still pending on read back
- **THEN** the stop returns UNRESOLVED and claims nothing
- **WHEN** the lookup of the find to cancel fails, or the cancel gets no
  answer
- **THEN** the stop returns UNRESOLVED and claims nothing

### Requirement: Billing on captured cents
The run endpoint SHALL declare a `PER_UNIT` model on `Unit.CREDIT`
consuming `0.01` of the `default` pool per unit; `usage.consolidate`
SHALL settle `commerce.amount_captured_cents / 100`, omitting the entry
when the claim is absent; `usage.estimate` SHALL equal
`confirm_max_cents`; `usage.evidence` SHALL report the captured cents.

#### Scenario: A settled run bills what was captured
- **WHEN** the run settles with 35 cents captured of a 60 cent
  reservation
- **THEN** usage is `{credits: {default: 0.35}, evidence: {CREDIT: 35}}`
- **AND** there is no `usage.mismatch`

#### Scenario: A run that finds nothing is free
- **WHEN** the run settles with no rows and 0 cents captured
- **THEN** `usage.credits` is `{}`

#### Scenario: The estimate is the approved maximum
- **WHEN** the run is estimated with `confirm_max_cents: 60`
- **THEN** the estimate is `{credits: {default: 0.6}, evidence: {CREDIT: 60}}`
