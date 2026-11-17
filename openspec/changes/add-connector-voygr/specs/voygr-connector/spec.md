# voygr-connector (delta)

## ADDED Requirements

### Requirement: VOYGR provider definition
The voygr provider SHALL declare name `voygr`, `request.baseUrl`
`https://api.voygr.tech`, auth `presets.auth.header("X-API-Key")`, the credit
pool `default` labelled "VOYGR credits ($0.01 each at list price)", one
`output` fn wired into both `fromResponse` and `fromError`, and a
`lifecycle.start` that every endpoint without its own lifecycle runs on.
Places endpoints SHALL carry the category `maps` and PlaceCall endpoints the
category `agentic-phone`.

#### Scenario: The 15 ids
- **WHEN** the bundle compiles
- **THEN** it holds `voygr#enrich`, `voygr#suggest-places`,
  `voygr#validate-batch`, `voygr#enrich-batch`, `voygr#get-job`,
  `voygr#cancel-job`, `voygr#place-call`, `voygr#list-calls`,
  `voygr#get-call`, `voygr#call-events`, `voygr#answer-call`,
  `voygr#cancel-call`, `voygr#list-skills`, `voygr#skill-manifest` and
  `voygr#me`, and the resource `voygr/sub-account`

#### Scenario: Cross-references resolve
- **WHEN** any voygr summary, description, note, field description or fn
  message names a `voygr#` id
- **THEN** that id is one of the 15 compiled endpoints

### Requirement: One VOYGR sub-account per Monid workspace
Every voygr endpoint SHALL bind `voygr/sub-account` with a keyless `uses`
and the one shared `ensure`. The `ensure` SHALL return no seed when the
workspace already owns a row. Otherwise it SHALL send
`POST /v1/sub-accounts` with `{reference: "monid:" + scope.key}` and no
`X-Sub-Account` header, and seed the returned `id` with
`data: {reference}`. Any answer other than 200 or 201, or a 2xx without an
id, SHALL throw.

#### Scenario: First use creates the sub-account
- **WHEN** a workspace with scope key `ws-1` and no row runs any endpoint
- **THEN** `ensure` posts reference `monid:ws-1` and seeds the 201 body's id

#### Scenario: Two first requests end at one sub-account
- **WHEN** a second `POST /v1/sub-accounts` with the same reference answers
  200 with the existing sub-account
- **THEN** `ensure` seeds the same id

#### Scenario: A key without sub-accounts
- **WHEN** VOYGR answers the create with 403
- **THEN** `ensure` throws "voygr sub-account ensure failed with HTTP 403"
  and the run does not start

### Requirement: The sub-account resource is free and never released upstream
`voygr/sub-account` SHALL use `resourceUsage.free()`. `verify` SHALL read
`GET /v1/sub-accounts/{id}` and report active on 200, whatever the
sub-account's status, inactive with reason `http_404` on 404, and throw on
any other answer. `release` SHALL make no request.

#### Scenario: A suspended sub-account stays owned
- **WHEN** `verify` reads a 200 with `status: "suspended"`
- **THEN** it reports active, so the workspace keeps its one sub-account
  and its new work gets VOYGR's 403 `SUB_ACCOUNT_SUSPENDED`

### Requirement: No request without the workspace's sub-account
Every request to VOYGR, the sub-account create and the resource ops
excepted, SHALL carry `X-Sub-Account` with the workspace's owned
sub-account id. When the workspace owns none, every phase of every endpoint
(`start`, and `poll` and `stop` where it has them) SHALL complete with HTTP
503 and output `{code: "SUB_ACCOUNT_UNAVAILABLE", message}` without a
request, and the run SHALL settle at zero.

#### Scenario: Every endpoint sends the header
- **WHEN** each of the 15 endpoints runs with an owned row, the async ones
  through start, poll and stop
- **THEN** every request carries `X-Sub-Account` and `X-API-Key`

#### Scenario: Every endpoint fails closed
- **WHEN** each of the 15 endpoints starts with no owned row, and each async
  run polls and stops after losing its row
- **THEN** each phase answers 503 `SUB_ACCOUNT_UNAVAILABLE` at zero usage
  and nothing goes upstream

#### Scenario: VOYGR's refusals pass through
- **WHEN** VOYGR answers 403 `SUB_ACCOUNT_SUSPENDED` or 404 for another
  workspace's call or job
- **THEN** the body comes back as data with `isProviderError` true and usage
  `{credits: {}, evidence: {}}`

### Requirement: Outputs carry nothing about the partner account
The provider `output.fromResponse` and `output.fromError` SHALL remove
`customer_id` and `recording_url` at any depth. `voygr#me` SHALL return only
`max_concurrent_calls`, `max_calls_per_day`,
`credits_charge_per_successful_call` and `maintenance`.

#### Scenario: Success and error bodies alike
- **WHEN** any endpoint's 2xx or 403 body holds `customer_id` or
  `recording_url`, at the top or nested
- **THEN** the output holds neither

#### Scenario: The partner's own view stays out of `me`
- **WHEN** `GET /users/me` answers with the key's ids, customer name, last
  four characters, quota and usage, balance and holds, webhook settings and
  admin flag
- **THEN** none of them is in the output

### Requirement: Enrich bills what VOYGR bills for one place
`voygr#enrich` SHALL send `POST /v1/enrich` with one flat place and SHALL NOT
accept `pois`, `sample`, `response_format`, `estimate_only` or
`verify_identity`. Its `PER_UNIT` credit count SHALL be 1 when any standard
attribute is asked (no `attributes` means the standard set), plus 1 per
research field, 2 for `owners` or `key_people` plus 1 per distinct contact in
`include`, plus 1 for `verify_name` or `verify_address`, plus 1 for
`verify_registered_address`. The settle SHALL drop the standard credit when
the request also researches or checks and no standard value came back, and
SHALL count only the standard lane when `meta.stopped_reason` is
`agent_unavailable`. The request SHALL wait up to 3,700 seconds.

#### Scenario: The estimate matches VOYGR's own
- **WHEN** a request shape was quoted live with `estimate_only`
- **THEN** the estimate equals VOYGR's `meta.estimated_credits` for it

#### Scenario: A refusal is free
- **WHEN** VOYGR answers 402 or 422
- **THEN** usage is zero and the body passes through

### Requirement: Suggest bills a flat 5 per answered request
`voygr#suggest-places` SHALL send `POST /v1/places/suggest` and bill
`PER_CALL` 5 credits on a 2xx.

#### Scenario: No places found
- **WHEN** VOYGR answers 422 `NO_PLACES_FOUND`
- **THEN** usage is zero

### Requirement: A place-call run is the call
`voygr#place-call` SHALL require `accept_terms` equal to the current terms
text and SHALL NOT send it. It SHALL send `POST /calls` with
`X-Client-Agent: monid:t20261023` and `Idempotency-Key: <runId>:call`,
retry once with the same key and body on 502, and retry up to 3 times with
the same key and body, each after `retry_after_seconds` (at most 30, 5 when
absent), on 409 `idempotency_in_progress`, also when it answers the 502
retry. Other non-2xx answers SHALL complete as data. It SHALL poll
`GET /calls/{call_id}` every 5 seconds and complete when the status is
`completed`, `failed` or `cancelled` and `outcome_type` or `result` is set.
It SHALL bill 10 credits when `outcome_charge_cents` is above 0, else 0.
`ask_user_mode` SHALL accept `any` and `stream` only.

#### Scenario: Wrong terms text
- **WHEN** `accept_terms` is missing or differs from the terms text
- **THEN** the run fails INVALID_INPUT before any request

#### Scenario: The outcome lands late
- **WHEN** the status is terminal and `outcome_type` and `result` are still
  null
- **THEN** the run keeps polling, and after 12 such reads it completes with
  `outcome_charge_cents: 0` and a `notes` field

#### Scenario: Reads keep failing
- **WHEN** a poll meets 429, a 5xx or no answer
- **THEN** the run keeps polling with no limit on failed reads (after a 429,
  at its `Retry-After`, at most 5 minutes away); when `runMs` runs out, the
  engine's stop cancels the call and settles from its record

#### Scenario: Stop cancels and settles from the record
- **WHEN** the host stops a running call
- **THEN** stop sends `POST /calls/{call_id}/cancel`, reads the call until it
  has an outcome (up to 12 reads 5 seconds apart) and completes with that
  record, so a cancel 30 seconds or more after pickup bills 10; a failed
  cancel or an unreadable call returns UNRESOLVED

### Requirement: Call events are read for finished calls only
`voygr#call-events` SHALL first read `GET /calls/{call_id}`. A non-2xx answer
SHALL complete as data. A call with neither `outcome_type` nor `result` set
SHALL complete with HTTP 409 and `{code: "CALL_STILL_RUNNING", message}`
without opening the event stream. A finished call SHALL return the SSE text of
`GET /calls/{call_id}/events`, or an empty text when there are no events.

#### Scenario: A running call
- **WHEN** the call's `outcome_type` and `result` are null
- **THEN** the answer is 409 `CALL_STILL_RUNNING` and only the call read went
  upstream

### Requirement: A batch run is the job
`voygr#validate-batch` and `voygr#enrich-batch` SHALL share one `start`,
`poll` and `stop`. Start SHALL send the job with
`Idempotency-Key: <runId>:job` and retry once with the same key on a 5xx or
no answer. Poll SHALL read `GET /v1/jobs/{batch_id}` at the job's ETA, at
least 30 seconds and at most 5 minutes apart, keep the run going on 429, a
5xx or no answer, and complete on `completed`, `failed` or `cancelled` with
the job as VOYGR returned it. Stop SHALL send `DELETE /v1/jobs/{batch_id}`,
read the job once and complete with that read, or return UNRESOLVED. The run
SHALL last up to 24 hours. `validate-batch` SHALL bill 1 credit per
`progress.succeeded` row. `enrich-batch` SHALL take `places` plus one set of
attributes and checks, send every place with those options, and bill
`progress.succeeded` times the one-place enrich price.

#### Scenario: Every row failed
- **WHEN** a job completes with `progress.succeeded` 0
- **THEN** usage is zero and the output still carries the job's status

#### Scenario: A refused submit
- **WHEN** VOYGR answers the submit with 400, 402 or 422
- **THEN** the run completes at once at zero usage with the body as data

### Requirement: Reads, answers and cancels are free relays
`voygr#get-job`, `voygr#cancel-job`, `voygr#list-calls`, `voygr#get-call`,
`voygr#answer-call`, `voygr#cancel-call`, `voygr#list-skills`,
`voygr#skill-manifest` and `voygr#me` SHALL be `FREE` and run on the
provider relay. GET endpoints SHALL take path and query parameters only.
`voygr#get-call` SHALL pass `pending_questions` and
`pending_questions_unavailable` through unchanged.

#### Scenario: Another workspace's call
- **WHEN** `voygr#get-call` names a call VOYGR does not show this sub-account
- **THEN** VOYGR's 404 comes back as data at zero usage

### Requirement: Shared fns intern once
The `ensure` SHALL compile to one fnTable entry across all 15 endpoints,
the output projection to one entry in the `fromError` of all 15 and the
`fromResponse` of the 14 other than `voygr#me`, and the relay `start` to one
entry across the 11 endpoints without a lifecycle of their own. The batch
`start`, `poll` and `stop` SHALL each compile to one entry across the two
batch endpoints.

#### Scenario: One entry each
- **WHEN** the 15 compiled docs are compared
- **THEN** they hold one `ensure` key, one `fromError` key (also the
  `fromResponse` key of all but `voygr#me`) and one relay `start` key for the
  11 endpoints without a lifecycle of their own
