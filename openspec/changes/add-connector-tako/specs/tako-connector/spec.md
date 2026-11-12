# tako-connector (delta)

## ADDED Requirements

### Requirement: Tako provider definition
The tako provider SHALL declare name `tako`, `request.baseUrl`
`https://tako.com/api`, auth `presets.auth.header("X-API-Key")`,
timeouts 60 s / 60 s, and one credit pool `default` ("US dollars"). Its
`usage.consolidate` SHALL pluck `$.usage` from the output and claim
`usage.total_cost_usd` in `default`. Its `usage.evidence` SHALL set
`metered` to `round(total_cost_usd / metered amount) − round(call amount
/ metered amount)`, read from the endpoint's own `usage.model`. Its
`output.fromError` SHALL
normalize a Tako error into `{message, code?, raw}`: `message` is
`error_message`, then `detail`, else "Tako error", and `code` is
`error_type` when present.

#### Scenario: The reported cost settles the call
- **WHEN** a Tako endpoint returns 200 with `usage.total_cost_usd`
  0.135
- **THEN** usage credits are `{default: 0.135}`
- **AND** the output carries no `usage` key

#### Scenario: A provider error is data, zero usage
- **WHEN** any endpoint returns 401 with
  `{error_type, error_message}`
- **THEN** the run completes as HTTP 401, `isProviderError` true,
  usage `{credits: {}, evidence: {}}`

#### Scenario: The error type is the error code
- **WHEN** Tako returns 422 with `error_type` `COST_CAP_EXCEEDED`
- **THEN** the output's `code` is `COST_CAP_EXCEEDED`

### Requirement: Search holds an upper bound
`tako#v3/search` SHALL bill `call` ($0.007) plus `metered` in $0.00001
units. Its estimate SHALL hold, in those units, 500 at `deep` effort,
plus `ceil(sources.data.max_variable_cost_usd × 100000)` when the data
source is present, plus `100 × count + min(count × max_rows, 2000 + 20 ×
count) × 160` when `sources.data.include_contents` is true. 160 units
($1.60 per 1,000 rows) is the most Tako bills for one inlined row: the
sum of every paid feed's row rate.

#### Scenario: A bare query holds the default cap
- **WHEN** the input is `{query}` alone
- **THEN** the estimate is `{call: 1, metered: 25000}`

#### Scenario: Inlined rows hold the highest row rate
- **WHEN** `sources` is `{data: {include_contents: true}}`
- **THEN** the estimate is `{call: 1, metered: 25000 + 5 × 100 + 5 × 20
  × 160}`

#### Scenario: A web-only search holds the base price
- **WHEN** `sources` is `{web: {}}`
- **THEN** the estimate is `{call: 1}`

#### Scenario: Evidence equals the claim
- **WHEN** `usage.total_cost_usd` is 0.012
- **THEN** evidence is `{call: 1, metered: 500}`

### Requirement: Search binding defaults reach the wire
A bare `{query}` SHALL send `effort: "fast"` and `sources` with
`data: {count: 5, include_contents: false, max_rows: 20,
max_variable_cost_usd: 0.25}` and `web: {highlights: true}`. A caller's
`sources` SHALL keep only the keys it sent, with defaults filled in.
`variable_cost`, `zdr`, `sources.data.mode`, and
`output_settings.force_refresh` SHALL fail INVALID_INPUT.

#### Scenario: A bare query sends the defaults
- **WHEN** the input is `{query}` alone
- **THEN** the body sent to Tako carries `effort: "fast"` and both
  sources with their defaults

#### Scenario: A caller's sources keep only their keys
- **WHEN** `sources` is `{data: {include_contents: true}}`
- **THEN** the body sent to Tako carries `sources.data` with its
  defaults filled in and no `web` key

### Requirement: Contents holds max_cost_usd
`tako#v1/contents` SHALL require `max_cost_usd` of at least $0.001,
default `mode` to `inline`, bill `call` ($0.001) plus `metered` in
$0.00001 units, and estimate `max(0, ceil(max_cost_usd × 100000) − 100)`
on `metered`. `quote_only` and `zdr` SHALL fail INVALID_INPUT.

#### Scenario: Over the cap is unbilled
- **WHEN** Tako returns 422 `COST_CAP_EXCEEDED`
- **THEN** usage is `{credits: {}, evidence: {}}` and the message
  carries the quoted price
