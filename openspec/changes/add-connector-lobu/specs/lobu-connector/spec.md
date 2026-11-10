# lobu-connector (delta)

## ADDED Requirements

### Requirement: Keyless, free provider

The lobu provider SHALL declare name `lobu`, base URL `https://app.lobu.ai`,
an empty credential shape, identity `auth.inject`, 25 s request / 30 s run
timeouts, and usage model `FREE`. It SHALL NOT declare a credit pool,
`usage.consolidate`, lifecycle, `input.toRequest`, `output.fromResponse`, or
`output.fromError`.

#### Scenario: Nothing is added to the request

- **WHEN** the endpoint runs
- **THEN** only content-type and the validated body are sent, no credential is
  resolved, and the engine reports empty credit/evidence usage

#### Scenario: Real anonymous requests carry no session credentials

- **WHEN** the opt-in live test searches, paginates, and reads source history
- **THEN** every outgoing request lacks Authorization and Cookie headers
- **AND** search pagination does not repeat event IDs from its first page
- **AND** a fresh signed-out browser can render returned public permalinks

### Requirement: Public discussion search and reading

The connector SHALL expose only `lobu#api/market/read_knowledge`, a POST whose
identity is its wire path. No entity lookup, SDK discovery, or mutation endpoint
SHALL be declared.

#### Scenario: One endpoint completes the research workflow

- **WHEN** an agent searches with a product-research query
- **THEN** it can read returned content IDs without resolving an entity
- **AND** source text, source URL, source date, and pagination survive the read
- **AND** neither step requires a Lobu account or incurs usage

### Requirement: Responses pass through unchanged

Responses SHALL reach the caller without connector output mapping.

#### Scenario: Recorded source metadata survives

- **WHEN** a successful fixture is replayed
- **THEN** output equals its recorded body, including content IDs, source URLs,
  permalinks, source dates, and version metadata

#### Scenario: Provider errors remain errors with zero usage

- **WHEN** the provider returns an error response
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the body passes through unchanged

### Requirement: Bindings enforce provider bounds

The input schema SHALL mirror the published provider fields and optionality;
bounds SHALL be enforced at the binding.

#### Scenario: Invalid input never reaches the provider

- **WHEN** a caller supplies blank query, invalid content/entity IDs, empty
  platform filters, or invalid limit, offset, similarity, weight, or sort values
- **THEN** the run fails with `INVALID_INPUT` without an upstream call

### Requirement: Accurate discovery and independent free value

Metadata SHALL describe the public discussion research available here and its
stored-data limitations. It SHALL NOT imply authenticated browser actions, SDK
execution, account setup, live scraping, exhaustive coverage, or verified claims.
Optional continuation in Lobu SHALL NOT be required for public research.

#### Scenario: Exact source reads expand version history

- **WHEN** a content ID resolves to a source with multiple stored versions
- **THEN** the response and pagination remain unchanged
- **AND** operational notes explain chronological history, `page.has_more`,
  `offset`, and `is_superseded`, without counting versions as independent reviews
