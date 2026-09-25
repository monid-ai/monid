# qbraid-connector (delta)

## ADDED Requirements

### Requirement: Thirteen endpoints, one key, one pool
The provider SHALL declare `https://api-v2.qbraid.com/api/v1`, the
`X-API-Key` header, and one pool of qBraid credits; every endpoint SHALL
carry a pinned slug id.

#### Scenario: The bundle compiles the full surface
- **WHEN** the bundle compiles
- **THEN** it contains exactly the 13 `qbraid#…` ids of the proposal,
  each in the `quantum-computing` category

### Requirement: Only submit-job bills
Every endpoint except `submit-job` SHALL be FREE. `submit-job` SHALL
claim the 201 envelope's `data.estimatedCost` as qBraid credits, strip
it from the output, and count it in millionths of a credit.

#### Scenario: A free simulator job
- **WHEN** `submit-job` answers 201 `success: true` with
  `estimatedCost: 0`
- **THEN** `usage` is `{credits: {}, evidence: {CREDIT: 0}}`

#### Scenario: A priced QPU job
- **WHEN** `submit-job` answers 201 `success: true` with
  `estimatedCost: 265`
- **THEN** `usage.credits` is `{default: 265}`, `usage.evidence` is
  `{CREDIT: 265000000}`, and `data.estimatedCost` is absent from the
  output

#### Scenario: Reading a job does not bill it again
- **WHEN** `get-job` returns a job carrying `estimatedCost`
- **THEN** `usage` is `{credits: {}, evidence: {}}`

### Requirement: A rejected submission bills nothing
`submit-job` SHALL settle a 2xx whose `success` is not `true` as a
provider error (OURS 502, THEIRS the vendor status) with zero usage.

#### Scenario: qBraid rejects with a 201
- **WHEN** `POST /jobs` answers 201 `{success: false}`
- **THEN** `httpStatus` is 502, `providerHttpStatus` is 201,
  `isProviderError` is true, `usage` is `{credits: {}, evidence: {}}`

#### Scenario: An unknown device
- **WHEN** `POST /jobs` answers 404 `NOT_FOUND`
- **THEN** `isProviderError` is true and `usage` is
  `{credits: {}, evidence: {}}`

### Requirement: Vendor errors are data
A non-2xx qBraid response SHALL settle as a provider error with zero
usage and `{message, code, raw}` from its `{success: false, message,
error}` envelope.

#### Scenario: A bad key
- **WHEN** any endpoint answers 401 with `error.code`
  `INVALID_API_KEY_FORMAT`
- **THEN** `output.code` is `INVALID_API_KEY_FORMAT` and `usage` is
  `{credits: {}, evidence: {}}`

#### Scenario: Cancelling a job that is still initializing
- **WHEN** `cancel-job` answers 409 `JOB_CANCEL_CONFLICT`
- **THEN** `isProviderError` is true and `output.code` is
  `JOB_CANCEL_CONFLICT`

### Requirement: Inputs are validated before the wire
Each endpoint SHALL reject a near-valid input with INVALID_INPUT and
accept its valid twin.

#### Scenario: The simulator rejects an empty program
- **WHEN** `simulate-circuit` receives `{qasm: ""}`
- **THEN** the run is rejected INVALID_INPUT

#### Scenario: A submit without program data
- **WHEN** `submit-job` receives a `program` with `format` and no `data`
- **THEN** the run is rejected INVALID_INPUT
