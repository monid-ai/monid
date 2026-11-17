# velabreakout-connector (delta)

## ADDED Requirements

### Requirement: Vela Breakout provider definition
The velabreakout provider SHALL declare name `velabreakout`,
`request.baseUrl` `https://breakout.vela.partners/api/v1`, auth
`presets.auth.bearer()`, timeouts 30 s request / 30 s run, one credit pool
`default` ("US dollars"), per-endpoint `usage.model`s of PER_UNIT RESULT
0.02 dollars on `/breakouts`, `/ideas` and `/rising-companies` and 0.01 on
`/company`, each counting one RESULT only when the answer's list (`rows`,
`ideas`, `companies`, `signals`) is non-empty, FREE on `/groups`, and NO
`usage.consolidate` (no response carries a meter).

#### Scenario: A ranked list costs $0.02
- **WHEN** `GET /breakouts?group=ai_apps&window_days=30&limit=3` returns 200
- **THEN** usage is `{credits: {default: 0.02}, evidence: {RESULT: 1}}`
- **AND** the output carries `group`, `measured_as_of`, `caveat`, `chart`
  and `rows` unchanged

#### Scenario: The price does not depend on limit
- **WHEN** `velabreakout#breakouts` is estimated with `limit: 1` and
  `limit: 25`
- **THEN** both estimates are `{credits: {default: 0.02}, evidence:
  {RESULT: 1}}`

#### Scenario: A company lookup costs $0.01
- **WHEN** `GET /company?name_or_domain=pre.dev` returns 200
- **THEN** usage is `{credits: {default: 0.01}, evidence: {RESULT: 1}}`

#### Scenario: An empty answer is free
- **WHEN** `GET /breakouts?group=ai_work&window_days=7&steady=true` returns
  200 with `rows: []`, or `/ideas`, `/rising-companies` or `/company`
  returns 200 with an empty `ideas`, `companies` or `signals`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}` and the answer
  rides through unchanged

#### Scenario: Groups are free
- **WHEN** `GET /groups` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`

#### Scenario: Errors are data, zero usage
- **WHEN** `GET /company?name_or_domain=nobody-here-zz` answers 404, or any
  endpoint answers 401
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence:
  {}}`, and the vendor `{error}` body rides through

### Requirement: Five endpoints mirroring the published OpenAPI
The connector SHALL provide `velabreakout#groups`,
`velabreakout#breakouts`, `velabreakout#company`, `velabreakout#ideas`
and `velabreakout#rising-companies`, each a GET whose strict query-param
schema mirrors the published OpenAPI: `group` required and limited to the
16 ids `/groups` returns; `window_days` one of 7, 30, 90, 365; `limit` an
integer 1-25; `min_size` one of median, p75, none; `steady` boolean;
`name_or_domain` required, 2-120 characters; `direction` required, rising
or fading. `POST /ask` SHALL NOT be exposed.

#### Scenario: Out-of-contract input is refused before the wire
- **WHEN** `velabreakout#breakouts` runs without `group`, with an unknown
  group, with `window_days: 14`, or with `limit: 26`
- **THEN** the run fails INVALID_INPUT and no request is sent

### Requirement: Descriptions never name an underlying data source
No meta text, describe, note, fixture or OpenSpec record of this connector
SHALL name a vendor or data source behind Breakout's figures; measures are
described by what they count (tokens, downloads, installs, adoption score,
open roles, forum points).
