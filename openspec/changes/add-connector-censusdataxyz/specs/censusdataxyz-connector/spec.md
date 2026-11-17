# censusdataxyz-connector (delta)

## ADDED Requirements

### Requirement: censusdataxyz provider
The provider SHALL declare name `censusdataxyz`, displayName
"censusdata.xyz", `request.baseUrl` `https://censusdata.xyz`, auth
`presets.auth.header("X-API-Key")`, request and run timeouts of 30 s, a FREE
usage model, and an `output.fromResponse` that removes the top-level `quota`
field and nothing nested.

#### Scenario: Quota is stripped
- **WHEN** a response carries `quota: {used: 3, limit: 10}`
- **THEN** the output has no `quota` and every other field is unchanged

#### Scenario: Exhausted allowance
- **WHEN** the vendor answers 429
- **THEN** `isProviderError` is true and usage is `{credits: {}, evidence: {}}`

### Requirement: Two GET endpoints
The connector SHALL provide `censusdataxyz#query` (`GET /query`, required
`q`) and `censusdataxyz#explore-variables` (`GET /explore-variables`,
required `keyword`), both strict query-param schemas.

#### Scenario: Unanswerable question
- **WHEN** `/query` answers 200 with `success: false`
- **THEN** the run completes as data (`isProviderError` false) with
  `error_details` in the output
