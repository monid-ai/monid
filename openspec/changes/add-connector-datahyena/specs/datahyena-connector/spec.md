# datahyena-connector (delta)

## ADDED Requirements

### Requirement: Datahyena provider definition with the shared vendor meter
The datahyena provider SHALL declare name `datahyena`, `request.baseUrl` `https://api.datahyena.com/v1`, auth `presets.auth.header("X-API-Key")`, timeouts 30 s request / 30 s run, credit pool `default` ("Datahyena credits"), a provider-level `usage.consolidate` that plucks the vendor's own `meta.creditsUsed` claim and strips `meta.creditsRemaining`, and a provider-level `usage.evidence` that counts the `data` array for PER_UNIT docs.

#### Scenario: Claim wins and agrees
- **WHEN** a list endpoint returns 2 rows with `meta.creditsUsed: 2`
- **THEN** usage is `{credits: {default: 2}, evidence: {RESULT: 2}}` and neither meter field remains in `output.meta`

#### Scenario: Empty result bills nothing
- **WHEN** a list endpoint returns `data: []` with `meta.creditsUsed: 0`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

### Requirement: Row-billed list endpoints bound by limit
Each of `datahyena#funding-events`, `#acquisitions`, `#exec-moves`, `#hiring-signals`, `#companies` and `#investors` SHALL model usage as PER_UNIT·RESULT at 1 credit per row, SHALL require `limit` between 1 and 100, and SHALL estimate the run at `limit` rows.

#### Scenario: limit is required and capped
- **WHEN** a caller omits `limit`, or passes 0 or 101
- **THEN** input validation rejects the run before any request is sent
