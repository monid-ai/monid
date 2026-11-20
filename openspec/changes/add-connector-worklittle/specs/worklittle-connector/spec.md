# worklittle-connector (delta)

## ADDED Requirements

### Requirement: Worklittle provider definition
The worklittle provider SHALL declare name `worklittle`, `request.baseUrl`
`https://api.worklittle.com`, bearer auth, one credit pool `default`
("US dollars"), a consolidate that makes no claim and strips the quota
counts (`meta.quota`, top-level `quota`) from the output, and a fromError mapping `{error: {code, message}}` to
`{message, code, raw}`.

#### Scenario: A free search strips the quota counts
- **WHEN** `GET /jobs` returns 200 with `meta.quota`
- **THEN** usage is `{credits: {}, evidence: {}}` and `meta.quota` is
  absent from the output

#### Scenario: A provider error is data
- **WHEN** any endpoint returns non-2xx
- **THEN** usage is zero and the output carries `code` and `raw`

### Requirement: Async documents
`worklittle#resumes` and `worklittle#cover-letters` SHALL submit with
`async: true` and `Idempotency-Key: {runId}`, poll
`GET /v1/documents/{id}`, and bill $0.01 only when a document with a
file comes back.

#### Scenario: A finished document bills one cent
- **WHEN** the submit answers 202 and the poll reaches `done` with html
- **THEN** usage is `{credits: {default: 0.01}, evidence: {CALL: 1}}`

#### Scenario: A failed document is free
- **WHEN** the poll answers `{status: failed, error: {code: BAD_REQUEST}}`
- **THEN** the run completes as HTTP 400, zero usage

### Requirement: Applications
`worklittle#apply` SHALL submit with
`use_profile: false` and `Idempotency-Key: {runId}:submit`, poll
`GET /v1/apply/{id}` until no application is queued or running, and bill
$0.20 per application whose final status is one Worklittle charges (`awaiting_input`, `awaiting_submit`, `completed`, `stopped`).

#### Scenario: A submitted application bills
- **WHEN** the session reaches `completed`
- **THEN** usage is `{credits: {default: 0.2}, evidence: {RESULT: 1}}`

#### Scenario: A failed or test application is free
- **WHEN** the session reaches `failed`, or the input has `test: true`
- **THEN** no credits are charged

### Requirement: Free management endpoints
Job search (and one job by `job_id`), salary average, company search,
`apply/profile` (save / get / delete) and `apply/{id}` (status /
continue / approve_submit / stop) SHALL be FREE. `apply/profile` get and
delete, and every `apply/{id}` action, SHALL require an id.

#### Scenario: An action needs its id
- **WHEN** `apply/profile` is called with `action: get` and no `applicant_id`,
  or `apply/{id}` without the application `id`
- **THEN** the run fails INVALID_INPUT before the wire
