# veille-connector (delta)

## ADDED Requirements

### Requirement: Veille provider definition
The veille provider SHALL declare name `veille`, `request.baseUrl` `https://api.veille.io`, auth `presets.auth.header("x-api-key")`, timeouts 60 s / 60 s, one credit pool `default` ("Veille credits") and a provider-level PER_CALL model of 1 credit, and NO `usage.consolidate` (responses carry no usage receipt).

#### Scenario: Veille Email Check consumes 3 credits
- **WHEN** `GET /v1/intelligence/email` returns 200
- **THEN** usage is `{credits: {default: 3}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Veille Email Verification consumes 5 credits
- **WHEN** `GET /v1/intelligence/emailq` returns 200
- **THEN** usage is `{credits: {default: 5}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Veille Domain Check consumes 2 credits
- **WHEN** `GET /v1/intelligence/domain` returns 200
- **THEN** usage is `{credits: {default: 2}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Veille Phone Check consumes 1 credit
- **WHEN** `GET /v1/intelligence/phone` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Veille VAT Check consumes 1 credit
- **WHEN** `GET /v1/vat` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged
#### Scenario: Veille IBAN Check consumes 1 credit
- **WHEN** `GET /v1/vat/iban` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** the vendor payload rides through unchanged

#### Scenario: A 401 is data, zero usage
- **WHEN** any endpoint is called with a missing or invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage `{credits: {}, evidence: {}}`, and the vendor error envelope rides through

### Requirement: 6 endpoints with strict inputs
The connector SHALL provide `veille#v1/intelligence/email`, `veille#v1/intelligence/emailq`, `veille#v1/intelligence/domain`, `veille#v1/intelligence/phone`, `veille#v1/vat`, `veille#v1/vat/iban`. Each input SHALL be a strict object: the required fields SHALL be enforced and an unknown key SHALL be rejected as `INVALID_INPUT`.

#### Scenario: Missing or unknown inputs are rejected
- **WHEN** an endpoint is called without its required field, or with an unknown key
- **THEN** the run is rejected as `INVALID_INPUT` before any request is sent
