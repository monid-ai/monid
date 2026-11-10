# call4me-connector (delta)

## ADDED Requirements

### Requirement: call4me provider definition
The call4me provider SHALL declare name `call4me`, `request.baseUrl`
`https://call4.me/api`, auth `presets.auth.bearer()`, credit pool `default`
("US dollars"), and an `output.fromError` that digests `{error}` into
`{message, raw}`.

#### Scenario: A refusal is zero-billed data
- **WHEN** `call4me#calls` receives a 422 "Not calling yet"
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output is `{message, raw}` with the vendor's list of what to ask

### Requirement: The run is the call
`call4me#calls` SHALL start the call with `POST /calls`, poll
`GET /calls/{id}?wait_seconds=20` until `finished` is true, and on stop hang
up with `POST /calls/{id}/hang-up` (404 and 409 count as already ended), then
read the call until it is finished, at most three times.

#### Scenario: The recorded call settles on its own meter
- **WHEN** the recorded NIST talking-clock call finishes with `cost_cents` 50
- **THEN** usage is `{credits: {default: 0.5}, evidence: {CREDIT: 50}}` with
  no `mismatch`

#### Scenario: Only a missing call ends the run on a failed poll
- **WHEN** a poll read answers 404
- **THEN** the run completes with that error as data and nothing metered
- **WHEN** a poll read answers any other non-2xx (5xx, 429, 401, 408)
- **THEN** the poll throws a retriable failure, since the call may still be
  live and metering

#### Scenario: Stop settles or stays unresolved
- **WHEN** the run is stopped and a read after the hang-up is finished
- **THEN** the stop returns COMPLETED and bills that record's `cost_cents`
- **WHEN** no read after the hang-up is finished
- **THEN** the stop returns UNRESOLVED with the call id in state

### Requirement: The hold prices the cap and grows with the call
The estimate SHALL count `25 × max(max_minutes, ceil(elapsedMs / 60000))`
cents, re-run every 30 s while the call is live.

#### Scenario: A call on hold past its cap
- **WHEN** `max_minutes` is 5 and 450 s have elapsed
- **THEN** the hold is `{default: 2}`

### Requirement: Pooled tenancy
The `call4me#calls` binding SHALL omit `connect_when`, `listen_in` and
`from`, and require `on_behalf_of` and `max_minutes`.
`call4me#requirements/{category}` SHALL omit `from_profile` and `known` from
its output.

#### Scenario: Account-wide fields never reach the wire
- **WHEN** a call omits `on_behalf_of` or `max_minutes`, or sets
  `listen_in`, `connect_when`, `from` or an unknown key
- **THEN** the run fails with `INVALID_INPUT` and no request is sent
