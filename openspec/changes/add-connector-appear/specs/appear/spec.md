## ADDED Requirements

### Requirement: Scan a public website

The connector SHALL submit a JSON domain and optional freshness flag to
Appear's public scan, using zero credentials and the FREE usage model.

#### Scenario: Successful scan

- **WHEN** Appear returns a readiness report
- **THEN** the caller receives the score and evidence, with embedded page
  screenshots removed, and settles zero usage.

#### Scenario: Scan rejected

- **WHEN** Appear returns a non-success HTTP status
- **THEN** the caller receives the provider status and error with zero usage.
