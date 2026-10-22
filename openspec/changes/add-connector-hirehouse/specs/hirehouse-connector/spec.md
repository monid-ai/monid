# hirehouse-connector (delta)

## ADDED Requirements

### Requirement: HireHouse provider definition
The hirehouse provider SHALL declare name `hirehouse`, `request.baseUrl`
`https://hirehouse.xyz/api/public`, a static request header
`X-HireHouse-Source: monid`, category `jobs`, timeouts 30 s / 30 s, an
OPTIONAL `apiKey` credential injected as `X-HireHouse-Key` only when set, and
a FREE usage model on every endpoint with no credit pool and no
`usage.consolidate`.

#### Scenario: Calls are free
- **WHEN** any hirehouse endpoint returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`

#### Scenario: Errors are data
- **WHEN** an endpoint returns 404 `not_found` or 429 `rate_limited`
- **THEN** the run completes with that status, `isProviderError` true,
  usage `{credits: {}, evidence: {}}`, and the vendor envelope
  `{error: {code, message}}` rides through

### Requirement: Three public job endpoints
The connector SHALL provide `GET /jobs/search` (`hirehouse#jobs/search`),
`GET /jobs/{id}` (`hirehouse#jobs/{id}`) and `GET /jobs/compare`
(`hirehouse#jobs/compare`). Search input SHALL be strict query params, all
optional: `query` (≤200), `location` (≤120), `workMode`
(remote/onsite/hybrid), `limit` (1–50), `cursor`. Get input SHALL be a strict
`id` path param (UUID). Compare input SHALL be a strict, required, non-empty
`ids` query param (comma-separated).

#### Scenario: Search bounds are enforced
- **WHEN** search is called with `limit: 51` or `workMode: "space"`
- **THEN** the run fails INVALID_INPUT
- **AND** `limit: 50` validates

#### Scenario: Job id must be a UUID
- **WHEN** get is called with an id that is not a UUID
- **THEN** the run fails INVALID_INPUT

#### Scenario: Compare needs ids
- **WHEN** compare is called with empty `ids` or an unknown key
- **THEN** the run fails INVALID_INPUT
