# capturekit-connector (delta)

## ADDED Requirements

### Requirement: CaptureKit provider definition
The capturekit provider SHALL declare name `capturekit`, `request.baseUrl` `https://api.capturekit.dev`, auth `presets.auth.header("x-api-key")`, timeouts 120 s / 120 s, one credit pool `default` ("CaptureKit credits") and a provider-level PER_CALL model of 1 credit, and NO `usage.consolidate` (responses carry no usage receipt).

#### Scenario: CaptureKit Page Content consumes 1 credit
- **WHEN** `GET /v1/content` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: CaptureKit Website Analysis consumes 1 credit
- **WHEN** `GET /v1/analyze` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: CaptureKit Website Crawler consumes 1 credit
- **WHEN** `GET /v1/website/crawler` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged

#### Scenario: A 401 is data, zero usage
- **WHEN** any endpoint is called with a missing or invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage `{credits: {}, evidence: {}}`, and the vendor error envelope rides through

### Requirement: 3 endpoints with strict inputs
The connector SHALL provide `capturekit#v1/content`, `capturekit#v1/analyze`, `capturekit#v1/website/crawler`. Each input SHALL be a strict object: the required fields SHALL be enforced and an unknown key SHALL be rejected as `INVALID_INPUT`.

#### Scenario: Missing or unknown inputs are rejected
- **WHEN** an endpoint is called without its required field, or with an unknown key
- **THEN** the run is rejected as `INVALID_INPUT` before any request is sent
