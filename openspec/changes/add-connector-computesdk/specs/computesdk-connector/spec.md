# computesdk-connector (delta)

## ADDED Requirements

### Requirement: ComputeSDK provider definition
The computesdk provider SHALL declare name `computesdk`, `request.baseUrl`
`https://platform.computesdk.com`, auth `presets.auth.bearer()`, category
`virtual-machines`, and NO provider-level credit pool or usage model. Every
endpoint SHALL be `FREE`.

#### Scenario: Calls carry no fee
- **WHEN** any computesdk endpoint returns 2xx
- **THEN** usage is `{credits: {}, evidence: {}}`

### Requirement: Sandbox resource
The connector SHALL define resource `computesdk/sandbox` with
`verify`, `release` and `refresh`, a `DAY` / `CREATION_TIME` period, and
one ESTIMATED `SECOND` line `compute` reconciled every 3 600 000 ms.
Reconcile SHALL read `GET /api/v1/sandboxes/{id}` and bill
`cost.rate.usd` per `cost.rate.per` over the overlap of
[`createdAt`, `destroyedAt` ?? window end] with the window (a running
sandbox reports `destroyedAt: null`; only `null` or an absent field means
running), and 0 when no rate is reported (BYOK). A failed read, a 404
included, or an unparseable timestamp, an empty `destroyedAt` included,
SHALL throw so settlement retries; it never settles 0.

#### Scenario: Runtime inside the window bills at the sandbox's rate
- **WHEN** a sandbox at $0.10/hour ran 30 minutes inside the window
- **THEN** reconcile consumes 0.05 of `default`

#### Scenario: A running sandbox bills up to the window end
- **WHEN** a sandbox at $0.10/hour created at 20:00 is still running and the
  window closes at `20:30Z`
- **THEN** reconcile consumes 0.05 of `default`

#### Scenario: A failed reconcile read does not settle zero
- **WHEN** the reconcile read answers 404
- **THEN** reconcile throws

#### Scenario: A destroyed sandbox verifies inactive
- **WHEN** verify reads a sandbox whose status is `destroyed`, or the id
  answers 404
- **THEN** the resource is inactive

### Requirement: Ownership-gated sandbox operations
Create SHALL provision the resource from `sandbox.id`; get-sandbox and
list-sandboxes SHALL read it; destroy-sandbox SHALL release it; every
in-sandbox endpoint SHALL USE it keyed `$.body.sandboxId`.

#### Scenario: A foreign sandbox is a uniform 404
- **WHEN** run-command, delete-path or kill-process names a sandbox the
  workspace does not own
- **THEN** the run answers 404 with zero usage and no upstream call

#### Scenario: List never reads the shared account
- **WHEN** list-sandboxes runs
- **THEN** it answers only the workspace's owned sandboxes from
  `utils.resources.owned`, never `GET /api/v1/sandboxes`

#### Scenario: Commands return a buffered result
- **WHEN** run-command runs `echo hello` in an owned sandbox
- **THEN** the request carries `Accept: application/json` and the output
  has `exitCode`, `stdout` and `stderr`

#### Scenario: Destroy settles runtime on the sandbox
- **WHEN** destroy-sandbox succeeds
- **THEN** the resource is released and the answer carries the settled
  `sandbox.cost.costUsd`

### Requirement: Provider pinning and quote shape
The `provider` input of `/create-sandbox` and `/get-quote` SHALL be one of
the managed provider ids `/get-options` lists. `/get-quote` SHALL return only
`ok`, `reason`, `providerOrder`, the placement's `provider`, `region` and
`size`, the rate, and the cost and balance fields.

#### Scenario: an unknown provider is refused
- **WHEN** `/create-sandbox` or `/get-quote` is called with a provider that is
  not listed
- **THEN** the run fails INVALID_INPUT and nothing is sent upstream

#### Scenario: a quote names its placement and price
- **WHEN** `/get-quote` answers
- **THEN** its `quote` carries the placement and the per-second, per-minute and
  per-hour rate

### Requirement: Request safety
`/create-sandbox` SHALL NOT accept a caller idempotency key, since every
workspace shares one ComputeSDK key. A `null` label SHALL provision the
sandbox identified by its id. `/read-file`, `/write-file` and `/delete-path`
SHALL refuse a relative `path` in the compiled schema. `/run-command` SHALL
set timeouts above its 290-second command window.
