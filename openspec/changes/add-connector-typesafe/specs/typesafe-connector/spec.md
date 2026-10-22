# typesafe-connector (delta)

## ADDED Requirements

### Requirement: typesafe provider and systemone endpoint
The provider SHALL declare name `typesafe`, `request.baseUrl`
`https://api.typesafe.ai`, bearer auth, 30 s request and run timeouts, and
one `default` pool labeled US dollars. `typesafe#systemone` SHALL send
`POST /v1/systemone` with the validated body, defaulting `model` to
`jev-latest` at the binding.

#### Scenario: Vendor validation error
- **WHEN** the vendor answers 422
- **THEN** `isProviderError` is true and usage is `{credits: {}, evidence: {}}`

### Requirement: Input tokens are the bill
The endpoint SHALL price `PER_UNIT` `TOKEN` at 0.000000042 dollars, count
evidence from `usage.input_tokens` (0 when absent), and estimate the UTF-8
byte length of the validated body.

#### Scenario: Settle
- **WHEN** a response reports `usage.input_tokens: 412`
- **THEN** evidence is `{TOKEN: 412}`

#### Scenario: Non-ASCII estimate
- **WHEN** the state contains multi-byte characters
- **THEN** the estimate counts their UTF-8 bytes, not characters
