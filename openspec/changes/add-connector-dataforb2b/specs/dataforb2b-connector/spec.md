# dataforb2b-connector (delta)

## ADDED Requirements

### Requirement: DataForB2B provider definition
The dataforb2b provider SHALL declare name `dataforb2b`, `request.baseUrl`
`https://api.dataforb2b.ai`, auth `presets.auth.header("api_key")`, and the
single credit pool `default` ("DataForB2B credits"). It SHALL declare a
provider-level `output.fromError` that normalizes FastAPI's `{detail}`
envelope (a string, an object with `error`, or a list of field errors) into
`{message, error_code?, raw}`.

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 402
  `{detail: {error: "Insufficient credits", ...}}` or a 404
  `{detail: "Profile not found"}`
- **THEN** `isProviderError` is true and usage is `{credits: {}, evidence: {}}`

### Requirement: The receipt bills
Every successful response carries `credits_used`. The provider SHALL declare
`usage.consolidate` claiming it as the `default` pool and plucking it out of
the output. Each endpoint SHALL model the published card as whole-unit
`PER_UNIT` lines so the derived fold cross-checks the receipt.

#### Scenario: Card and receipt agree
- **WHEN** a live people search returns 2 results with `credits_used` 3
- **THEN** usage is `{credits: {default: 3}, evidence: {live_result: 2}}` and
  the output carries no `credits_used`

#### Scenario: An empty search settles zero
- **WHEN** a search returns no results with `credits_used` 0
- **THEN** no credits are billed

### Requirement: Searches price per result on the requested mode
`search/people` and `search/companies` SHALL require `count` (1-1000) and
SHALL default `enrich_live` to the route's server default (true for people,
false for companies). The estimate SHALL count `count` on `live_result`
(1.5) or `indexed_result` (0.75); the evidence SHALL count the returned
`results` on the same line.

#### Scenario: Estimate follows the mode
- **WHEN** a people search is estimated with `count` 10 and no `enrich_live`
- **THEN** the estimate is 15 credits; with `enrich_live: false` it is 7.5

### Requirement: Enrichment bills only what it found
`enrich/profile` SHALL reject a body with no `enrich_*` flag set to true.
The estimate SHALL count every requested item (profile 1.5, work email 1,
personal email 3, phone 10; `enrich_github` implies the profile); the
evidence SHALL count only the items returned non-null.

#### Scenario: Misses are free
- **WHEN** profile, work email, personal email and phone are requested and
  only the profile and work email come back, with `credits_used` 2.5
- **THEN** usage is `{credits: {default: 2.5}, evidence: {profile: 1,
  work_email: 1}}`
