# capsolver-connector (delta)

## ADDED Requirements

### Requirement: CapSolver provider definition
The provider SHALL declare name `capsolver`, JSON-body `clientKey`
authentication, `https://api.capsolver.com` as its base URL, and the documented
asynchronous task lifecycle. Credentials SHALL be injected by the transport and
SHALL NOT be added to lifecycle state or log messages. Recorded JSON clientKey
fields SHALL be redacted before entering the recording sink; live requests
and responses SHALL retain their original values.

#### Scenario: An asynchronous task reaches ready
- **WHEN** `createTask` returns a task id and `getTaskResult` progresses from
  `processing` to `ready`
- **THEN** the run completes with the final provider response and solution
- **AND** errorId is numeric zero and the task-specific token is non-empty
- **AND** the successful endpoint's per-call usage is settled once

#### Scenario: The provider rejects a task
- **WHEN** CapSolver returns a non-zero `errorId` or an HTTP error
- **THEN** the run completes as a provider error
- **AND** usage is zero

#### Scenario: The provider returns malformed success
- **WHEN** a ready response omits the expected token, supplies an empty or
  non-string token, or supplies a missing or invalid success errorId
- **THEN** the connector returns a provider error with logical HTTP 502
- **AND** usage is zero

#### Scenario: Recording a body-authenticated task
- **WHEN** a createTask or getTaskResult exchange is recorded
- **THEN** live requests contain clientKey and captured JSON clientKey fields
  contain a redaction placeholder, including nested or echoed copies
- **AND** trimming is not required for credential redaction

### Requirement: Proxyless token endpoints
The connector SHALL expose `/solve/recaptcha-v2`, `/solve/recaptcha-v3`, and
`/solve/turnstile`. Each endpoint SHALL require `websiteURL` and `websiteKey`,
map the caller input to the corresponding CapSolver proxyless task type, and
declare the configured standard rate for that task family.

#### Scenario: Solve a reCAPTCHA v2 challenge
- **WHEN** a caller submits an authorized page URL and public site key to
  `/solve/recaptcha-v2`
- **THEN** the wire request uses `ReCaptchaV2TaskProxyLess`
- **AND** the API key is injected as `clientKey` outside lifecycle hooks

#### Scenario: Forward optional standard reCAPTCHA fields
- **WHEN** callers supply recaptchaDataSValue for v2, or isSession/apiDomain
  for v2 or v3
- **THEN** the connector accepts and forwards those values without defaults
- **AND** the output preserves provider extension fields

#### Scenario: Preserve a reCAPTCHA v2 action
- **WHEN** a caller supplies pageAction from the widget's anchor sa parameter
- **THEN** the v2 task forwards the value unchanged
- **AND** no action value is invented when the input omits it

#### Scenario: Add optional Turnstile metadata
- **WHEN** a caller provides `action` or `cdata` to `/solve/turnstile`
- **THEN** the wire task includes metadata.action and/or metadata.cdata
- **AND** it does not add an undocumented metadata.type

### Requirement: Offline regression coverage
Each endpoint SHALL include endpoint.test.ts. Tests SHALL execute compiled
sealed units against shared provider-level fixtures without network access or
real credentials. Real recordings SHALL identify their source; synthetic
fixtures SHALL retain a synthetic- filename prefix until replaced by recordings.

#### Scenario: Replaying a task
- **WHEN** the offline suite replays a fixture
- **THEN** it checks method, URL, complete JSON request body, clientKey injection,
  poll task IDs, final output, and exact usage
- **AND** every recorded call is consumed

#### Scenario: Regressing body credential handling
- **WHEN** recordingFetch or scrubCalls receives nested JSON clientKey variants
- **THEN** request and response recording copies contain redaction placeholders
- **AND** live payloads and caller-owned source objects remain unchanged
- **AND** unrelated fields and solution tokens remain intact

#### Scenario: Running live checks
- **WHEN** credentials or explicit live-test opt-in are absent
- **THEN** live tests are skipped
- **AND** Turnstile success tests additionally require an explicitly configured non-dummy demo widget URL and key
