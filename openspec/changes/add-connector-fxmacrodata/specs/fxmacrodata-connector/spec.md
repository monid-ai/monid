# fxmacrodata-connector (delta)

## ADDED Requirements

### Requirement: FXMacroData provider definition
The fxmacrodata provider SHALL declare name `fxmacrodata`, `request.baseUrl`
`https://api.fxmacrodata.com`, timeouts 30 s / 30 s, a provider-level
`usage.model` of FREE, and NO `usage.consolidate`. `auth.credentials` SHALL
declare one OPTIONAL field `apiKey`; `auth.inject` SHALL set `X-API-Key`
when `apiKey` resolves and SHALL return the request unchanged otherwise.

#### Scenario: A key is sent when configured
- **WHEN** `FXMACRODATA_API_KEY` is set and any endpoint runs
- **THEN** the request carries `X-API-Key` with that value

#### Scenario: No key, bare request
- **WHEN** no credential resolves
- **THEN** the run does not fail MISSING_CREDENTIAL
- **AND** the request carries neither `X-API-Key` nor `Authorization`

#### Scenario: Every run is free
- **WHEN** any endpoint returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`

### Requirement: Five GET endpoints
The connector SHALL provide, all `economic-data`:
`GET /v1/data_catalogue/{currency}`,
`GET /v1/announcements/{currency}/latest`,
`GET /v1/announcements/{currency}/{indicator}`,
`GET /v1/calendar/{currency}` and `GET /v1/forex/{base}/{quote}`.
`currency`, `base` and `quote` SHALL be one of the 22 published codes, upper
case; the calendar SHALL also accept `COMM`. Query params SHALL be strict
mirrors of the published OpenAPI; `limit` SHALL be 1–100, `offset` ≥ 0 and
`page` ≥ 1 where present.

#### Scenario: Keyless USD history
- **WHEN** `GET /v1/announcements/USD/inflation?limit=2&fields=compact`
  runs without a key
- **THEN** the run returns 200 with two compact rows, and the vendor's
  `freemium_window` and `freemium_delay` notices ride through unchanged

#### Scenario: FX rates without a key
- **WHEN** `GET /v1/forex/EUR/USD` runs without a key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and the `api_key_required` envelope rides
  through

#### Scenario: Out-of-range page size
- **WHEN** a history or FX call passes `limit: 0` or `limit: 101`
- **THEN** the run fails INVALID_INPUT
