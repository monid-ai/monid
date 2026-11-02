# stophy-connector (delta)

## ADDED Requirements

### Requirement: Stophy provider definition
The stophy provider SHALL declare name `stophy`, `request.baseUrl`
`https://api.stophy.dev/v1`, auth `presets.auth.bearer()`, a single
`default` pool labelled "Stophy calls", a provider-level
`usage.consolidate` that lifts `creditsUsed` out of the response, and a
provider-level `output.fromError` that reads `$.error.message`.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `stophy#google/search`, `stophy#google/news`,
  `stophy#reddit/search`, `stophy#youtube/transcript`,
  `stophy#youtube/comments`, `stophy#google/maps/search`,
  `stophy#google/maps/reviews` and `stophy#x/profile` exist

### Requirement: Per-call billing, free when nothing is found
Every endpoint SHALL consume 1 `default` unit per call. The list
endpoints (`google/search`, `google/news`, `reddit/search`,
`youtube/comments`, `google/maps/search`, `google/maps/reviews`) SHALL
bill that unit only when `data.results` is non-empty. `youtube/transcript`
and `x/profile` SHALL be flat PER_CALL. `google/search` SHALL be a
COMPOSITE of a `call` component and a `read_page` PER_UNIT component
(1 unit per result that came back with a non-empty `markdown`), whose
estimate is `scrapeLimit` (vendor default 3) when `scrapeResults` is on.

#### Scenario: Flat settle
- **WHEN** a `stophy#reddit/search` run returns 200 with results
- **THEN** it bills 1 unit, evidenced `RESULT: 1`

#### Scenario: Pages read
- **WHEN** a `stophy#google/search` run with `scrapeResults: true` returns
  three results, two carrying `markdown`
- **THEN** it bills 3 units, evidenced `call: 1, read_page: 2`

#### Scenario: Empty results are free
- **WHEN** a list endpoint returns 200 with `data.results: []`
- **THEN** it bills nothing

#### Scenario: Errors are free
- **WHEN** the vendor answers 401
- **THEN** the run completes as provider-error data and bills nothing

### Requirement: The vendor meter wins when it reports usage
`usage.consolidate` SHALL remove `creditsUsed` from the output and SHALL
report it as the `default` claim only when it is a number above zero; a
zero SHALL be omitted so the derived fold decides.

#### Scenario: Meter lifted out
- **WHEN** any run returns 200
- **THEN** the output has keys `success`, `data` and `requestId`, and no
  `creditsUsed`

### Requirement: Faithful, strict input mirrors
Every body SHALL mirror the vendor's endpoint catalog with optionality
only and SHALL be strict — an unknown key fails INVALID_INPUT. Where the
vendor takes one of two identifiers (`videoUrl`/`videoId`,
`placeUrl`/`placeId`, `profileUrl`/`username`, `query`/`topic`), the
binding SHALL accept exactly one.

#### Scenario: Both identifiers rejected
- **WHEN** a caller sends both `videoId` and `videoUrl` to
  `stophy#youtube/transcript`
- **THEN** the run fails with INVALID_INPUT before any network call
