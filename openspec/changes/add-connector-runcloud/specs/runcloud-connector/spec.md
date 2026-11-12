# runcloud-connector (delta)

## ADDED Requirements

### Requirement: run.cloud provider definition
The provider SHALL declare name `runcloud`, `request.baseUrl`
`https://api.run.cloud`, auth `presets.auth.bearer()`, category
`mobile-simulators`, and one projection fn on both `output.fromResponse` and
`output.fromError` that deep-omits `orgId`, `leaseId`, `device` and `hostId`.
It SHALL NOT declare a lifecycle or a credit pool, because no endpoint bills.

#### Scenario: Pooled internals never reach a workspace
- **WHEN** any endpoint returns a session or an acknowledgement
- **THEN** the output carries no `orgId`, `leaseId`, `device` or `hostId`, and
  the signed viewer `url` is kept

### Requirement: The simulator session is an owned, time-metered resource
`runcloud/simulator-session` SHALL store `{platform}`, declare a one-DAY
CREATION_TIME period and one ESTIMATED line `active-time` priced at $0.02 per
MINUTE, and reconcile it hourly. The reading SHALL be run.cloud's own bill
re-derived from the session payload: `floor(min(releasedAt ?? endIso, endIso)
- createdAt)` seconds at $0.02/60, rounded to nanodollars; zero when the
session never had a `leaseId` or ended before the window started. A failed read
SHALL throw.

#### Scenario: A running session meters to the window end
- **WHEN** a session created at 10:00:00.000Z and still active is reconciled
  for a window ending 10:01:30.999Z
- **THEN** the reading is $0.03 (90 s)

#### Scenario: An ended session bills to its release
- **WHEN** a session released at 10:07:30.500Z is reconciled hours later
- **THEN** the reading is $0.15 (450 s), and a window starting after the
  release reads $0

#### Scenario: Verify and release
- **WHEN** the session is no longer `active` or `provisioning`
- **THEN** verify answers inactive with the status as reason
- **WHEN** release's `DELETE` answers 503 and a re-read shows the session
  released
- **THEN** release succeeds; if the re-read still shows it active, release
  throws so the platform retries

### Requirement: Starting a session
`/start-session` SHALL `POST /run-cloud/{platform}` with an
`Idempotency-Key` of `{runId}:start`, provision the session from the raw
response's `id` and `platform`, and be FREE. The binding SHALL default
`inactivityTimeout` to `5m` and `hardTimeout` to `30m`, and SHALL refuse
`none` for the idle timeout.

#### Scenario: Defaults and idempotency reach the wire
- **WHEN** a caller starts an Android session with an empty body under run id
  `run-42`
- **THEN** the request carries `Idempotency-Key: run-42:start` and the body
  `{inactivityTimeout: "5m", hardTimeout: "30m"}`

#### Scenario: A 2xx without an id is an alarm
- **WHEN** the create answers 201 without a readable `id`
- **THEN** the run fails `PROVISION_CONSTRUCT`

### Requirement: Session endpoints are ownership-gated
Every session endpoint SHALL take `{platform, sessionId}` path parameters and
key its binding on `$.pathParams.sessionId`: `/tap`, `/swipe`, `/type-text`,
`/press-key`, `/press-button` and `/open-url` USE the session; `/get-session`,
`/read-screen` and `/device-logs` READ it; `/stop-session` RELEASES it and
issues the `DELETE` itself.

#### Scenario: A foreign session never reaches run.cloud
- **WHEN** any session endpoint is called with a session id the workspace does
  not own
- **THEN** it answers the uniform 404 with zero usage and no upstream call

### Requirement: Interactions map to the vendor's action route
The five interaction endpoints SHALL `POST
/run-cloud/{platform}/{sessionId}/interactions` with the caller's body plus
`action` (`tap`, `swipe`, `typeText`, `pressKey`, `pressButton`), and SHALL
enforce `SIMULATOR_INTERACTION_LIMITS`, `SIMULATOR_KEYS` and
`SIMULATOR_BUTTONS` from the run.cloud SDK in their schemas.

#### Scenario: A tap is a tap on the wire
- **WHEN** `/tap` is called with `{x: 0.25, y: 1}`
- **THEN** the body sent is `{x: 0.25, y: 1, action: "tap"}`

### Requirement: Reading the screen
`/read-screen` SHALL flatten the accessibility tree depth-first in screen
order, skip `group`/`other`/`window`/`application`/`scroll-view`/`list` nodes
with no label, value or identifier, keep the first 400 elements, and give each
its rounded bounds and a normalized `center` (three decimals), with `truncated`
set when elements were dropped.

#### Scenario: More than 400 elements
- **WHEN** a screen has 450 labelled rows
- **THEN** the output has 400 nodes and `truncated: true`
