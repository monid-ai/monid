# huntapi-connector (delta)

## ADDED Requirements

### Requirement: HuntAPI provider definition
The huntapi provider SHALL declare name `huntapi`, `request.baseUrl` `https://api.huntapi.com`, auth `presets.auth.header("x-api-key")`, timeouts 60 s / 60 s, one credit pool `default` ("HuntAPI credits") and a provider-level PER_CALL model of 1 credit, and NO `usage.consolidate` (responses carry no usage receipt).

#### Scenario: HuntAPI Video Download consumes 1 credit
- **WHEN** `GET /v1/video/download` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: HuntAPI Audio Download consumes 1 credit
- **WHEN** `GET /v1/audio/download` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: HuntAPI Job Status is free
- **WHEN** `GET /v1/jobs/{id}` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** the vendor payload rides through unchanged

#### Scenario: A 401 is data, zero usage
- **WHEN** any endpoint is called with a missing or invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage `{credits: {}, evidence: {}}`, and the vendor error envelope rides through

### Requirement: 3 endpoints with strict inputs
The connector SHALL provide `huntapi#v1/video/download`, `huntapi#v1/audio/download`, `huntapi#v1/jobs/{id}`. Each input SHALL be a strict object: the required fields SHALL be enforced and an unknown key SHALL be rejected as `INVALID_INPUT`.

#### Scenario: Missing or unknown inputs are rejected
- **WHEN** an endpoint is called without its required field, or with an unknown key
- **THEN** the run is rejected as `INVALID_INPUT` before any request is sent
