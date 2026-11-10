# fuse-connector (delta)

## ADDED Requirements

### Requirement: Reverse lookups settle on Fuse's receipt
`fuse#data/people/reverse-email` and `fuse#data/people/reverse-phone` SHALL
each price a leaf `PER_UNIT` in `CREDIT` units at amount 1, settled by the
provider's receipt evidence, and SHALL estimate one person found: 1 for an
email and 2 for a phone.

#### Scenario: An address names its owner
- **WHEN** a reverse email lookup answers `found` with `creditsCharged: 1`
- **THEN** usage is `{credits: {default: 1}, evidence: {CREDIT: 1}}` and
  `creditsCharged` is absent from the output

#### Scenario: A number nobody has
- **WHEN** a reverse phone lookup answers `not_found` with
  `creditsCharged: 0`
- **THEN** usage is `{credits: {}, evidence: {CREDIT: 0}}`

#### Scenario: A number Fuse cannot read
- **WHEN** a reverse phone lookup answers 422 `PHONE_NUMBER_INVALID`
- **THEN** `isProviderError` is true and usage is
  `{credits: {}, evidence: {}}`

### Requirement: A company's people page on the receipt
`fuse#data/companies/people` SHALL price a leaf `PER_UNIT` in `CREDIT` units
at amount 1, settled by the receipt, and SHALL estimate a full page: `size`,
defaulting to 10. It SHALL pass the opaque `scrollToken` through untouched,
and its `filters` SHALL be the people search vocabulary without
`job_company_name`, `job_company_website`, `experience.company.name` and
`experience.company.website`.

#### Scenario: A page of two
- **WHEN** a page answers two people, a `scrollToken` and
  `creditsCharged: 2`
- **THEN** usage is `{credits: {default: 2}, evidence: {CREDIT: 2}}` and the
  output carries both people and the token

#### Scenario: A company filter
- **WHEN** the list is sent `filters.job_company_name`
- **THEN** the run fails `INVALID_INPUT` before any request
