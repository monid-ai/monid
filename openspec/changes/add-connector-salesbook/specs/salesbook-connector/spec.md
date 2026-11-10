# salesbook-connector (delta)

## ADDED Requirements

### Requirement: Keyless, free provider

The salesbook provider SHALL declare name `salesbook`, `request.baseUrl`
`https://mcp.maxeds.org`, an empty credential shape, an identity
`auth.inject`, timeouts 15 s request / 20 s run, and usage model `FREE`. It
SHALL NOT declare a credit pool, `usage.consolidate`, a lifecycle,
`input.toRequest`, `output.fromResponse` or `output.fromError`.

#### Scenario: Nothing is added to the request

- **WHEN** any salesbook endpoint runs
- **THEN** the request carries only `content-type: application/json` and
  the validated body, no credential is resolved, and nothing is billed

### Requirement: Read-only surface

The connector SHALL expose exactly `salesbook#v1/tools/search_startups`,
`#v1/tools/get_profile`, `#v1/tools/get_ranking`,
`#v1/tools/find_alternatives` and `#v1/tools/compare_vendors`, each a
`POST` whose identity is its wire path. No endpoint that writes to the
vendor SHALL be declared.

#### Scenario: The compiled bundle holds five reads

- **WHEN** the bundle is compiled
- **THEN** the `salesbook#` ids are exactly those five

### Requirement: Answers pass through verbatim

Every response SHALL reach the caller as the vendor sent it.

#### Scenario: Sources survive

- **WHEN** `search_startups` returns ranked lines
- **THEN** the output equals the recorded body and each line keeps its
  `source:` URL and the methodology version

#### Scenario: An empty answer is a 200 that says so

- **WHEN** a query, vendor or comparison matches nothing SalesBook ranks
- **THEN** the run is not a provider error, usage is zero, and `text`
  says there was no match

#### Scenario: Vendor errors are zero-billed data

- **WHEN** the vendor answers 400 (unknown id), 429 (daily cap), 503
  (maintenance) or 500
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`
  and the body passes through untouched

### Requirement: Bindings carry the vendor's bounds

Inputs SHALL mirror the published OpenAPI with optionality only, and the
bindings SHALL reject what the vendor documents as invalid before any call.

#### Scenario: Out-of-bounds input never reaches the vendor

- **WHEN** a caller sends an empty `query`, a `limit` outside 1-25
  (search) or 1-15 (alternatives), an unknown `sector`, or fewer than 2 or
  more than 5 `vendors`
- **THEN** the run fails with `INVALID_INPUT` and no upstream call is made
