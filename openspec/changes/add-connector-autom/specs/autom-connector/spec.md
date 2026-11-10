# autom-connector (delta)

## ADDED Requirements

### Requirement: Autom provider definition
The autom provider SHALL declare name `autom`, `request.baseUrl` `https://api.autom.dev`, auth `presets.auth.header("x-api-key")`, timeouts 60 s / 60 s, one credit pool `default` ("Autom credits") and a provider-level PER_CALL model of 1 credit, and NO `usage.consolidate` (responses carry no usage receipt).

#### Scenario: Autom Google Search consumes 1 credit
- **WHEN** `GET /v1/google/search` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Autom Google News consumes 1 credit
- **WHEN** `GET /v1/google/news` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Autom Brave Search consumes 1 credit
- **WHEN** `GET /v1/brave/search` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Autom DuckDuckGo Search consumes 1 credit
- **WHEN** `GET /v1/duckduckgo/search` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Autom Yahoo Search consumes 1 credit
- **WHEN** `GET /v1/yahoo/search` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged

#### Scenario: A 401 is data, zero usage
- **WHEN** any endpoint is called with an invalid API key, which is sent upstream (a missing or empty key fails as `MISSING_CREDENTIAL` before any request is built)
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage `{credits: {}, evidence: {}}`, and the vendor error envelope rides through

### Requirement: 5 endpoints with strict inputs
The connector SHALL provide `autom#v1/google/search`, `autom#v1/google/news`, `autom#v1/brave/search`, `autom#v1/duckduckgo/search`, `autom#v1/yahoo/search`. Each input SHALL be a strict object: the required fields SHALL be enforced and an unknown key SHALL be rejected as `INVALID_INPUT`.

#### Scenario: Missing or unknown inputs are rejected
- **WHEN** an endpoint is called without its required field, or with an unknown key
- **THEN** the run is rejected as `INVALID_INPUT` before any request is sent
