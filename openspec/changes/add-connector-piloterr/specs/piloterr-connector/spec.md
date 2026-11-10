# piloterr-connector (delta)

## ADDED Requirements

### Requirement: Piloterr provider definition
The piloterr provider SHALL declare name `piloterr`, `request.baseUrl` `https://api.piloterr.com`, auth `presets.auth.header("x-api-key")`, timeouts 120 s / 120 s, one credit pool `default` ("Piloterr credits") and a provider-level PER_CALL model of 1 credit, and NO `usage.consolidate` (responses carry no usage receipt).

#### Scenario: Piloterr Website Crawler consumes 1 credit
- **WHEN** `GET /v2/website/crawler` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Piloterr Website Rendering consumes 2 credits
- **WHEN** `GET /v2/website/rendering` returns 200
- **THEN** usage is `{credits: {default: 2}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Piloterr Website Technology consumes 1 credit
- **WHEN** `GET /v2/website/technology` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged

#### Scenario: A 401 is data, zero usage
- **WHEN** any endpoint is called with a missing or invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage `{credits: {}, evidence: {}}`, and the vendor error envelope rides through

### Requirement: 3 endpoints with strict inputs
The connector SHALL provide `piloterr#v2/website/crawler`, `piloterr#v2/website/rendering`, `piloterr#v2/website/technology`. Each input SHALL be a strict object: the required fields SHALL be enforced and an unknown key SHALL be rejected as `INVALID_INPUT`.

#### Scenario: Missing or unknown inputs are rejected
- **WHEN** an endpoint is called without its required field, or with an unknown key
- **THEN** the run is rejected as `INVALID_INPUT` before any request is sent
