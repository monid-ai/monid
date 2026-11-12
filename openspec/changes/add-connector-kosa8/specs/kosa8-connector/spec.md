# kosa8-connector (delta)

## ADDED Requirements

### Requirement: kosa8 provider definition
The kosa8 provider SHALL declare name `kosa8`, `request.baseUrl`
`https://api.kosa8.com`, auth `presets.auth.bearer()` with the default
`{apiKey}` credential, timeouts 45 s / 60 s, and a provider `fromResponse`
that strips `cost_usd` from success outputs.

### Requirement: Sandboxes are owned resources
The connector SHALL define resource `kosa8/sandbox` with a one-month
CREATION_TIME period and ESTIMATED lines `vcpu`, `memory` and
`snapshot-storage` priced at $0.048 per vCPU-hour, $0.0154 per GiB-hour and
$0.08 per GiB-month, each reconciled hourly from the sandbox's own counters.

#### Scenario: A live sandbox is metered from its counters
- **WHEN** the meter reads a 2 vCPU, 4096 MB eu-hel1 sandbox with 3600 s
  running and 7200 s asleep on a 4 GiB snapshot
- **THEN** `vcpu` is $0.096, `memory` is $0.0616 and `snapshot-storage` is
  2 × 4 × 0.08 / 730 dollars

#### Scenario: A deleted sandbox is still metered
- **WHEN** `GET /v1/sandboxes/{id}` answers 404
- **THEN** the meter reads the sandbox from `GET /v1/sandboxes?all=1`
- **AND** throws when it is not there

### Requirement: Seven endpoints, all free runs
The connector SHALL provide create-sandbox (PROVISIONS), exec, sleep-sandbox
and wake-sandbox (USES), get-sandbox (READS), delete-sandbox (RELEASES) and
list-templates (unbound), each with a FREE usage model.

#### Scenario: Create requires a TTL
- **WHEN** `/create-sandbox` is called without `ttl_s`, with `ttl_s` above
  2419200, with a Store reference template, or with `accept_price`
- **THEN** the run fails INVALID_INPUT before the wire

#### Scenario: A foreign sandbox is a uniform 404
- **WHEN** `/exec` or `/delete-sandbox` names a sandbox this workspace does
  not own
- **THEN** the run answers 404 with zero attempts upstream

#### Scenario: Delete releases at once
- **WHEN** `/delete-sandbox` succeeds
- **THEN** the upstream DELETE has run and the settle carries a release mark
  for the sandbox
