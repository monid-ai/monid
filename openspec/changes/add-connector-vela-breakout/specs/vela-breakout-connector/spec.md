# vela-breakout-connector (delta)

## ADDED Requirements

### Requirement: Vela Breakout provider definition
The vela-breakout provider SHALL declare name `vela-breakout`,
`request.baseUrl` `https://breakout.vela.partners/api/v1`, auth
`presets.auth.bearer()`, timeouts 30 s request / 30 s run, one credit pool
`default` ("US dollars"), a provider-level `usage.model` of PER_CALL 0.002
dollars, and NO `usage.consolidate` (no response carries a meter).

#### Scenario: A data call costs $0.002
- **WHEN** `GET /breakouts?group=ai_apps&window_days=30&limit=3` returns 200
- **THEN** usage is `{credits: {default: 0.002}, evidence: {CALL: 1}}`
- **AND** the output carries `group`, `measured_as_of`, `caveat`, `chart`
  and `rows` unchanged

#### Scenario: The price does not depend on limit
- **WHEN** `vela-breakout#breakouts` is estimated with `limit: 1` and
  `limit: 25`
- **THEN** both estimates are `{credits: {default: 0.002}, evidence:
  {CALL: 1}}`

#### Scenario: Groups are free
- **WHEN** `GET /groups` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`

#### Scenario: Errors are data, zero usage
- **WHEN** `GET /company?name_or_domain=nobody-here-zz` answers 404, or any
  endpoint answers 401
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence:
  {}}`, and the vendor `{error}` body rides through

### Requirement: Five endpoints mirroring the published OpenAPI
The connector SHALL provide `vela-breakout#groups`,
`vela-breakout#breakouts`, `vela-breakout#company`, `vela-breakout#ideas`
and `vela-breakout#rising-companies`, each a GET whose strict query-param
schema mirrors the published OpenAPI: `group` required and limited to the
16 ids `/groups` returns; `window_days` one of 7, 30, 90, 365; `limit` an
integer 1-25; `min_size` one of median, p75, none; `steady` boolean;
`name_or_domain` required, 2-120 characters; `direction` required, rising
or fading. `POST /ask` SHALL NOT be exposed.

#### Scenario: Out-of-contract input is refused before the wire
- **WHEN** `vela-breakout#breakouts` runs without `group`, with an unknown
  group, with `window_days: 14`, or with `limit: 26`
- **THEN** the run fails INVALID_INPUT and no request is sent

### Requirement: Descriptions never name an underlying data source
No meta text, describe, note, fixture or OpenSpec record of this connector
SHALL name a vendor or data source behind Breakout's figures; measures are
described by what they count (tokens, downloads, installs, adoption score,
open roles, forum points).
