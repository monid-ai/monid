# ecommerce-leads-connector (delta)

## ADDED Requirements

### Requirement: One free lookup endpoint behind a Bearer key
The provider SHALL declare `https://getecommerceleads.com/api`, Bearer
auth, and the FREE usage model; the one endpoint SHALL be a GET whose id
is `ecommerce-leads#stores/lookup`.

#### Scenario: The compiled catalog
- **WHEN** the bundle compiles
- **THEN** exactly one `ecommerce-leads#…` doc exists, with
  `request.url = https://getecommerceleads.com/api/stores/lookup`, no
  `consolidate`, and the synthesized empty quantities fn

### Requirement: A lookup is free and relayed verbatim
#### Scenario: A tracked store
- **WHEN** `stores/lookup` answers 200 for `domain=gymshark.com`
- **THEN** `usage` is `{credits: {}, evidence: {}}` and `output`
  deep-equals the response body

### Requirement: Vendor errors are data
#### Scenario: An untracked domain
- **WHEN** `stores/lookup` answers 404 `{error: "No store found for that domain."}`
- **THEN** `isProviderError` is true and `usage` is
  `{credits: {}, evidence: {}}`

#### Scenario: A bad key
- **WHEN** `stores/lookup` answers 401 `{error: "Invalid API key"}`
- **THEN** `isProviderError` is true and `usage` is
  `{credits: {}, evidence: {}}`

### Requirement: The input mirror is strict
#### Scenario: An unknown query key
- **WHEN** `stores/lookup` receives `{domain, tab}`
- **THEN** the run is rejected INVALID_INPUT before the wire
