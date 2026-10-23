# scraper-connector (delta)

## ADDED Requirements

### Requirement: Scraper provider definition
The scraper provider SHALL declare name `scraper`, `request.baseUrl`
`https://scraper.run/api/v1/tools`, auth `presets.auth.bearer()`, a single
`default` credit pool labelled "Scraper credits", and a provider-level
`output.fromError` that reads `message`, then `code`, from the vendor's
problem body.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly these ids exist under `scraper#`:
  `indeed/jobs`, `indeed/companies`, `linkedin/jobs`,
  `linkedin/job-detail`, `linkedin/post`, `glassdoor/jobs`,
  `glassdoor/job-detail`, `glassdoor/company-jobs`,
  `glassdoor/company-profile`, `glassdoor/company-reviews`,
  `glassdoor/company-salaries`, `glassdoor/company-interviews`,
  `glassdoor/company-benefits`, `naukri/jobs`, `naukri/job-detail`,
  `upwork/jobs`, and `upwork/job-detail`

### Requirement: Per-tool billing checked against the vendor meter
Each endpoint SHALL model the vendor's per-tool rate card, which is also
the number the vendor reports in `meta.creditsUsed` (verified on a live
recording of every endpoint). `indeed/jobs`, `linkedin/jobs`,
`linkedin/job-detail`, `upwork/jobs`, and `upwork/job-detail` SHALL be
leaf `PER_CALL` at 1 credit. `linkedin/post`, `naukri/job-detail`, and the
eight `glassdoor/*` endpoints SHALL be leaf `PER_CALL` at 2 credits.
`indeed/companies` SHALL be leaf `PER_UNIT` over `RESULT` with
`every: 25` and amount 1, so a call bills 1 credit per started block of 25
requested profiles; the estimate SHALL be the number of `companyKeys` in
lookup mode and `maxItems` (vendor default 50) in search mode, and the
evidence SHALL be the response's `requestedCount`. `naukri/jobs` SHALL be
COMPOSITE: a `call` component at 1 credit plus a `detail_enrichment`
component at 1 credit that counts 1 when `fetchDetails` is true and 0
otherwise, whatever `maxItems` is. The provider SHALL lift the vendor
meter with `usage.consolidate` (`$.meta.creditsUsed`, removed from the
output); a non-empty vendor claim wins and a disagreement with the derived
fold surfaces as `usage.mismatch`.

#### Scenario: Flat settle
- **WHEN** a `scraper#glassdoor/company-reviews` run returns 201
- **THEN** usage is `{credits: {default: 2}, evidence: {CALL: 1}}` and the
  output carries no `meta.creditsUsed`

#### Scenario: Block-rate estimate
- **WHEN** `scraper#indeed/companies` is estimated with `maxItems: 26`
- **THEN** the estimate is 2 credits; with `maxItems: 25` it is 1

#### Scenario: Naukri detail surcharge
- **WHEN** a `scraper#naukri/jobs` run sets `fetchDetails: true`
- **THEN** usage is
  `{credits: {default: 2}, evidence: {call: 1, detail_enrichment: 1}}`,
  and without `fetchDetails` it is
  `{credits: {default: 1}, evidence: {call: 1, detail_enrichment: 0}}`

#### Scenario: Errors are free
- **WHEN** the vendor answers 401
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}` and the output message is the vendor's
  `message`

### Requirement: Faithful strict input mirrors
Every request body SHALL mirror the vendor's request schema: optionality
only, no `.default()`, `.trim()`, or `.transform()`, with each vendor
default stated in the field's description. The one exception is
`indeed/companies.maxItems`, whose vendor default is applied at the binding
site because the estimate reads it. Every body SHALL be `.strict()`, so an
unknown key fails INVALID_INPUT before any network call. The detail
endpoints `linkedin/job-detail`, `naukri/job-detail`, and
`upwork/job-detail` SHALL accept exactly one of `jobId` or `jobUrl`,
modeled as a union of strict objects. Cross-field rules that a JSON Schema
cannot express (for example, `fetchDetails` needs `maxItems` of 10 or
less) SHALL be stated in the description of the field they constrain.

#### Scenario: Unknown key rejected
- **WHEN** a caller passes a misspelled field (e.g. `max_items`) to
  `scraper#indeed/jobs`
- **THEN** the run fails with INVALID_INPUT before any network call

#### Scenario: Both identifiers rejected
- **WHEN** a caller passes both `jobId` and `jobUrl` to
  `scraper#linkedin/job-detail`
- **THEN** the run fails with INVALID_INPUT before any network call

#### Scenario: Neither identifier rejected
- **WHEN** a caller passes an empty body to `scraper#upwork/job-detail`
- **THEN** the run fails with INVALID_INPUT before any network call
