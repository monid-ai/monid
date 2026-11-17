# typesafe-connector (delta)

## ADDED Requirements

### Requirement: typesafe provider and systemone endpoint
The provider SHALL declare name `typesafe`, `request.baseUrl`
`https://api.typesafe.ai`, bearer auth, a 30 s request and 60 s run
timeout, the `decision-models` category, and one `default` pool labeled US
dollars. `typesafe#systemone` SHALL send `POST /v1/systemone` with the
validated body, defaulting `model` to `jev-latest` at the binding.

#### Scenario: Vendor validation error
- **WHEN** the vendor answers 422 (e.g. a model it does not serve)
- **THEN** `isProviderError` is true and usage is `{credits: {}, evidence: {}}`

### Requirement: The input matches the hosted schema
The input SHALL require `state` and at least one question; every question
SHALL require `instructions`; `score` SHALL take 2–10 levels and `choice`
1–255 options; unknown fields, `assets` and `box` questions SHALL be
rejected before any upstream call.

#### Scenario: Out-of-range rubric
- **WHEN** a `score` question has 1 or 11 levels, or a `choice` has 0 or
  256 options
- **THEN** the run is rejected INVALID_INPUT; 2 and 10 levels, 1 and 255
  options are accepted

### Requirement: Input tokens are the bill
The endpoint SHALL price `PER_UNIT` `TOKEN` at 0.000000042 dollars, count
evidence from `usage.input_tokens` (0 when absent), and estimate the UTF-8
byte length of the validated body.

#### Scenario: Settle
- **WHEN** the response reports `usage.input_tokens: 407` for a 526-byte
  body
- **THEN** evidence is `{TOKEN: 407}` and the estimate was `{TOKEN: 526}`

#### Scenario: Non-ASCII estimate
- **WHEN** the state contains multi-byte characters
- **THEN** the estimate counts their UTF-8 bytes, not characters
