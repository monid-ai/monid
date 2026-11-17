# tomba-connector (delta)

## ADDED Requirements

### Requirement: Twenty endpoints, a key pair, four pools
The provider SHALL declare `https://api.tomba.io/v1`, inject the
credential pair as `X-Tomba-Key` and `X-Tomba-Secret`, and declare the
pools `search`, `verification`, `email_count`, and `sources`, each
drained by at least one endpoint. Endpoint ids SHALL derive from the REST
path that the matching MCP tool calls.

#### Scenario: The compiled set
- **WHEN** the bundle compiles
- **THEN** it holds exactly 20 `tomba#` endpoints, every request url
  starts with `https://api.tomba.io/v1/`, and all of them share one
  `auth.inject` and one `output.fromError`

### Requirement: The requested limit is the cost basis
`domain-search` and `similar` SHALL require `limit`, and SHALL bill 1
search credit per started block of ten REQUESTED results, only when at
least one result is returned.

#### Scenario: A limit-20 page with phone data
- **WHEN** `domain-search` with `limit: 20, enrich_mobile: true` returns
  two addresses, one carrying phone data
- **THEN** `usage` is `{credits: {search: 7}, evidence: {results: 20,
  phones: 1}}`

#### Scenario: A webmail domain
- **WHEN** `domain-search` returns an empty `data.emails`
- **THEN** `usage` is `{credits: {}, evidence: {results: 0, phones: 0}}`

### Requirement: Hits bill, misses are free
The finder and enrichment endpoints SHALL count a result only when one is
returned: `email-finder` and `enrich` only when the verification status
isn't `unknown`, and `email-verifier` only when the status isn't
`disposable` or `unknown`. A 200 that carries an `errors` object (the
Clearbit-format trio) SHALL be a zero-count success, not a provider
error.

#### Scenario: Person API no-match
- **WHEN** `people/find` answers 200 with `{errors: {type: "not_found"}}`
- **THEN** `isProviderError` is false and `usage` is `{credits: {},
  evidence: {RESULT: 0}}`

#### Scenario: Verifier with phone numbers
- **WHEN** `email-verifier` with `enrich_mobile: true` returns a `valid`
  verdict and two phone numbers
- **THEN** `usage` is `{credits: {verification: 1, search: 10},
  evidence: {verification: 1, phones: 2}}`

### Requirement: The input selects the phone-finder price
`phone-finder` SHALL bill 5 search credits, or 1 when the request
includes `domain`, and only when a returned number is valid.

#### Scenario: A company number by domain
- **WHEN** `phone-finder` with `domain` returns a valid number
- **THEN** `usage` is `{credits: {search: 1}, evidence: {lookup: 0,
  domain_lookup: 1}}`

### Requirement: Provider errors are digested and zero-billed
Every non-2xx SHALL settle with zero usage and output `{message,
error_code, raw}`, read from Tomba's `{errors: {type, message, code}}`.

#### Scenario: Credentials that match no account
- **WHEN** any endpoint answers 401 `authentication_failed`
- **THEN** `isProviderError` is true, `usage` is `{credits: {},
  evidence: {}}`, and `error_code` is `authentication_failed`
