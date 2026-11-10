# asin-connector (delta)

## ADDED Requirements

### Requirement: Asin provider definition
The asin provider SHALL declare name `asin`, `request.baseUrl` `https://www.asin.dev/api/v1`, auth `presets.auth.bearer()`, timeouts 60 s / 60 s, no credit pool and a provider-level FREE model, and NO `usage.consolidate` (responses carry no usage receipt).

#### Scenario: Asin Amazon Search is free
- **WHEN** `GET /search` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Asin Price History is free
- **WHEN** `GET /history` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Asin Product Offers is free
- **WHEN** `GET /offers` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** the vendor payload rides through unchanged

#### Scenario: A 401 is data, zero usage
- **WHEN** any endpoint is called with a missing or invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage `{credits: {}, evidence: {}}`, and the vendor error envelope rides through

### Requirement: 3 endpoints with strict inputs
The connector SHALL provide `asin#search`, `asin#history`, `asin#offers`. Each input SHALL be a strict object: the required fields SHALL be enforced and an unknown key SHALL be rejected as `INVALID_INPUT`.

#### Scenario: Missing or unknown inputs are rejected
- **WHEN** an endpoint is called without its required field, or with an unknown key
- **THEN** the run is rejected as `INVALID_INPUT` before any request is sent
