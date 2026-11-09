# companyregistryapi-connector (delta)

## ADDED Requirements

### Requirement: Keyless FREE provider definition

The companyregistryapi provider SHALL declare name `companyregistryapi`,
`request.baseUrl` `https://api.companyregistryapi.com`, auth with an empty
credential shape and an `auth.inject` that returns the request unchanged,
timeouts 15 s request / 20 s run, and usage model `FREE`. The provider SHALL
NOT declare a lifecycle, `usage.consolidate`, `input.toRequest`,
`output.fromResponse` or `output.fromError`.

#### Scenario: A success is free

- **WHEN** either endpoint returns HTTP 200
- **THEN** usage is `{credits: {}, evidence: {}}` and the output is the
  vendor body unchanged, `attribution: "Powered by Coragrid"` included

#### Scenario: Vendor non-2xx is zero-billed data

- **WHEN** an endpoint receives a 400, 404 or 429 RFC 9457 problem document
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the problem document passes through untouched

### Requirement: Identities are the vendor's own paths

Each endpoint's identity SHALL be its wire path, `{company_id}` placeholder
included: `companyregistryapi#v1/search` and
`companyregistryapi#v1/companies/{company_id}`.

#### Scenario: Both identities are locked

- **WHEN** `deno task ids:check` runs
- **THEN** both identities are present in `connectors/ids.lock.json`

### Requirement: Inputs mirror the published OpenAPI, strictly

`#v1/search` SHALL take query parameters `q` (required, 3–64 characters),
`address_country` and `jurisdiction` (the published patterns), `limit`
(integer 1–25) and `cursor`. `#v1/companies/{company_id}` SHALL take path
parameter `company_id` matching `^co_[0-7][0-9a-hj-km-np-tv-z]{25}$`. Both
schemas SHALL reject unknown keys.

#### Scenario: Malformed input never reaches the wire

- **WHEN** `q` is shorter than 3 characters, `limit` is 0 or 26,
  `address_country` is three letters, an unknown key is present, or
  `company_id` is a name, a registry number or an uppercase ID
- **THEN** the run fails `INVALID_INPUT` before any request is made
