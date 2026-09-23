# brightdata-connector (delta)

## ADDED Requirements

### Requirement: Bright Data provider definition with zone-bearing credentials
The brightdata provider SHALL declare name `brightdata`, `request.baseUrl`
`https://api.brightdata.com`, timeouts 120 s request / 125 s run, credit pool
`default` ("US dollars"), and credentials
`{apiKey, serpZone, unlockerZone}`. It SHALL NOT declare `auth.inject`,
`usage.consolidate`, `output.fromResponse`, `output.fromError` or a
lifecycle: the two endpoints share a wire path so each states its own zone,
and Bright Data reports no meter and wraps no error.

#### Scenario: Zone never reaches the caller
- **WHEN** either compiled endpoint's body schema is inspected
- **THEN** it carries no `zone` property, although the vendor documents
  `zone` as required

#### Scenario: Credential fields derive the env convention
- **WHEN** the live-test gate runs
- **THEN** it opens only when `BRIGHTDATA_CREDENTIALS_API_KEY` (or the bare
  `BRIGHTDATA_API_KEY` alias), `BRIGHTDATA_CREDENTIALS_SERP_ZONE` and
  `BRIGHTDATA_CREDENTIALS_UNLOCKER_ZONE` are all set

#### Scenario: No meter means no claim
- **WHEN** any brightdata endpoint completes successfully
- **THEN** `usage.credits` is the derived fold alone and `usage.mismatch` is
  absent

### Requirement: Two products on one wire path, disambiguated by declared id
Both endpoints SHALL target `POST /request` and SHALL declare `endpoint` —
`/serp` and `/unlocker` — so their ids do not collide on
`brightdata#request`. Each SHALL declare its own `auth.inject`, which sends
`Authorization: Bearer <apiKey>` and merges its own zone field into the body
via `utils.json.merge`.

#### Scenario: Ids are distinct on a shared path
- **WHEN** `brightdata#serp` and `brightdata#unlocker` are inspected
- **THEN** both carry `request.url`
  `https://api.brightdata.com/request` and method `POST`, and their ids
  differ

#### Scenario: Product-specific fields stay on their product
- **WHEN** the two body schemas are compared
- **THEN** `render` and `debug` are present on `brightdata#unlocker` and
  absent from `brightdata#serp`

### Requirement: Flat per-request billing at the published pay-as-you-go rate
Each endpoint SHALL declare a LEAF `PER_CALL` model consuming 0.0015 of the
`default` pool, with no metered line, no `usage.estimate` and no
`usage.evidence` — the compiler synthesizing the empty counts fn.

#### Scenario: Result count does not enter the bill
- **WHEN** `brightdata#serp` returns a page of organic results
- **THEN** usage is `{credits: {default: 0.0015}, evidence: {CALL: 1}}`

#### Scenario: Page weight does not enter the bill
- **WHEN** `brightdata#unlocker` returns a markdown payload
- **THEN** usage is `{credits: {default: 0.0015}, evidence: {CALL: 1}}`

### Requirement: The envelope decides what is billed
A 2xx envelope SHALL settle as billable success regardless of the TARGET's
own status code, which Bright Data reports in the `x-brd-status-code`
response header and, under `format: "json"`, as a `status_code` field in the
body. A non-2xx envelope SHALL settle as zero-usage provider error.

#### Scenario: A target 404 is a billable unlock
- **WHEN** `brightdata#unlocker` fetches a url whose target answers 404 and
  Bright Data answers 200 with `status_code: 404` in the body
- **THEN** `isProviderError` is false and usage is
  `{credits: {default: 0.0015}, evidence: {CALL: 1}}`

#### Scenario: A rejected key is zero-billed data
- **WHEN** Bright Data answers 401 with the bare string `Invalid token`
- **THEN** `isProviderError` is true, usage is
  `{credits: {}, evidence: {}}`, and the output is the string `Invalid token`

#### Scenario: A wrong zone is zero-billed data
- **WHEN** Bright Data answers 400 with the bare string
  `zone "x" not found`
- **THEN** `isProviderError` is true and usage is
  `{credits: {}, evidence: {}}`

### Requirement: Non-JSON payloads ride through as faithful strings
Neither endpoint SHALL declare `output.fromResponse`. A payload that is not
JSON — the target's HTML, a markdown conversion, a plain-text error — SHALL
reach the caller as the complete raw body via the engine's sniffing decode.

#### Scenario: Markdown is a string, not an object
- **WHEN** `brightdata#unlocker` runs with `data_format: "markdown"`
- **THEN** the output is a string beginning with the converted page's first
  line
