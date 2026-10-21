# akta-connector (delta)

## ADDED Requirements

### Requirement: Fourteen more Akta endpoints inherit the provider hooks
The akta connector SHALL add these endpoints, each a declarative request
under the provider's `x-api-key` auth, array→CSV `input.toRequest`, and
`credits_consumed` `usage.consolidate` (one interned fn each across all 20
docs): `v1/company/enrichment/concise`, `v1/company/enrichment/markdown`,
`v1/company/enrichment/logo/{company}`,
`v1/company/enrichment/partnerships/{company}`,
`v1/company/enrichment/peers/{company}`,
`v1/company/enrichment/swot/{company}`, `v1/company/headcount-trends`,
`v1/company/website-traffic`, `v1/company/jobs`, `v1/company/posts`,
`v1/filters/list`, `v1/filters/options` (POST),
`v1/list/generate/companies` (POST), and `v1/news/by-id`. Every request path
SHALL carry a trailing slash, as the existing six do.

#### Scenario: Shared interning
- **WHEN** the bundle is compiled
- **THEN** all 20 akta docs reference the same consolidate, toRequest, and
  auth.inject fn keys

#### Scenario: Path-param readers
- **WHEN** `akta#v1/company/enrichment/swot/{company}` runs with
  `{pathParams: {company: "canva.com"}}`
- **THEN** the wire request is
  `GET https://api.akta.pro/api/v1/company/enrichment/swot/canva.com/`

### Requirement: Each endpoint pins the published credit card
Each endpoint's `usage.model` SHALL pin the agent-docs credit table:
concise `PER_CALL` 3; partnerships, peers, swot `PER_CALL` 0.5;
headcount-trends `PER_CALL` 2.5; website-traffic `PER_CALL` 1.5; jobs
`PER_UNIT` `RESULT` every 10 at 4; posts `PER_UNIT` `RESULT` every 10 at 1;
list generation `COMPOSITE` of `request` (`PER_CALL` 1.5) and `company`
(`PER_UNIT` 0.2); news/by-id `COMPOSITE` of `request` (`PER_CALL` 0.1) and
`article` (`PER_UNIT` 0.01); markdown `COMPOSITE` with one `PER_UNIT`
component per section id; logo, filters/list, and filters/options `FREE`.

#### Scenario: Started blocks bill whole
- **WHEN** `akta#v1/company/jobs` delivers 2 job posts
- **THEN** evidence is `{RESULT: 2}` and the derived fold is 4 credits

#### Scenario: List generation base plus per company
- **WHEN** list generation delivers 2 companies
- **THEN** evidence is `{request: 1, company: 2}` and the fold is 1.9 credits

### Requirement: Estimates read a caller-stated basis
`jobs`, `posts`, and list generation SHALL require `limit` at the binding and
estimate it as their metered quantity; markdown SHALL require `sections` and
estimate one count per requested section; news/by-id SHALL estimate one
article per requested id. Input mirrors stay vendor-faithful.

#### Scenario: Markdown counts what it rendered
- **WHEN** a markdown response carries
  `sections_included: ["trust_signal", "location"]`
- **THEN** evidence is `{trust_signal: 1, location: 1}`
