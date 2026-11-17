# particle-connector (delta)

## ADDED Requirements

### Requirement: Particle provider definition
The particle provider SHALL declare name `particle`, `request.baseUrl`
`https://api.particle.pro`, auth `presets.auth.header("X-API-Key")`,
timeouts 60 s / 60 s, one credit pool `default` ("US dollars"), a
provider-level `usage.model` of PER_CALL $0.003 (Particle's list price,
particle.pro/pricing Individual column, 2026-10-29), NO `usage.consolidate`
(no response body carries a receipt), and an `output.fromError` that
digests Particle's RFC 7807 envelope into `{message, code?, resolve?,
raw}`.

#### Scenario: A $0.003 endpoint settles its flat price
- **WHEN** `GET /v1/podcasts/search?q=all-in&limit=2` returns 200
- **THEN** usage is `{credits: {default: 0.003}, evidence: {CALL: 1}}`
- **AND** the output carries `data`, `has_more` and `cursor`

#### Scenario: A costlier endpoint overrides only the amount
- **WHEN** `GET /v1/podcasts/mentions?company_id=nvidia.com&limit=2`
  returns 200
- **THEN** usage is `{credits: {default: 0.015}, evidence: {CALL: 1}}`
- **AND** the doc's auth fn and credit pool are the provider's

#### Scenario: A 401 is digested data, zero usage
- **WHEN** any endpoint is called with an invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true,
  usage `{credits: {}, evidence: {}}`, output `code` is
  `api_key_required`, `message` is Particle's `detail`, and the
  problem+json envelope rides under `raw`

### Requirement: Seven GET endpoints
The connector SHALL provide `particle#v1/podcasts/search`,
`particle#v1/podcasts/{id}`, `particle#v1/podcasts/{id}/episodes`,
`particle#v1/podcasts/episodes/search`, `particle#v1/podcasts/mentions`,
`particle#v1/entities/search` and
`particle#v1/podcasts/episodes/{id}/transcript`, all in category
`podcasts`, each with strict query params mirroring the OpenAPI
(enumerated values as enums, documented bounds as bounds, list filters
as comma-separated strings) and strict path params where the route has
one.

#### Scenario: Bounds and enums gate before the wire
- **WHEN** `limit` is 0 or 101, `context` is 0 or 16,
  `popularity_threshold` is 1.5, or an enum takes an unlisted value
- **THEN** the run fails INVALID_INPUT and no call is issued

#### Scenario: Unknown query keys are rejected
- **WHEN** a query param the mirror does not list is passed
- **THEN** the run fails INVALID_INPUT

#### Scenario: Required inputs
- **WHEN** `entities/search` is called without `q`, or a `{id}` route is
  called with an empty id
- **THEN** the run fails INVALID_INPUT
