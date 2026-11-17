# datalegion-connector (delta)

## ADDED Requirements

### Requirement: Six product keys, each endpoint sends its own
The datalegion provider SHALL declare one credential shape requiring
`personBaseNoPiiApiKey`, `personBasePiiApiKey`, `personPremiumNoPiiApiKey`,
`personPremiumPiiApiKey`, `companyBaseApiKey` and `companyPremiumApiKey`,
and NO provider inject. Each endpoint SHALL declare an inline inject placing
its own product's key in the `API-Key` header, and SHALL NOT filter request
or response fields.

#### Scenario: Every doc carries the six-key credential
- **WHEN** the bundle is compiled
- **THEN** all six docs SHALL carry a credentials schema requiring the six
  keys, and each doc's inject SHALL name exactly its own product's key

#### Scenario: The vendor body rides out unchanged
- **WHEN** any product returns a match
- **THEN** the output SHALL equal the vendor body

### Requirement: One credit per successful call from the product's pool
The provider SHALL declare six credit pools, `person_base_no_pii`,
`person_base_pii`, `person_premium_no_pii`, `person_premium_pii`,
`company_base` and `company_premium`. Each endpoint SHALL price `PER_CALL`
at 1 credit from its own product's pool.

#### Scenario: One match
- **WHEN** `person/enrich/base/no-pii` returns a match
- **THEN** usage is `{credits: {person_base_no_pii: 1}, evidence: {CALL: 1}}`

#### Scenario: No match
- **WHEN** the vendor answers 404
- **THEN** `isProviderError` is true and usage is `{credits: {}, evidence: {}}`

### Requirement: A company call needs an identifier
Each company endpoint SHALL bind its body as a union requiring one of
`domain`, `name`, `linkedin_id`, `social_url`, `ticker_symbol` or
`legion_id`.

#### Scenario: Industry alone
- **WHEN** a company body carries only `industry`
- **THEN** the run SHALL fail `INVALID_INPUT` before the wire
