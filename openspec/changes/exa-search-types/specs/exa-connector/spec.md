# exa-connector (delta)

## MODIFIED Requirements

### Requirement: Search is priced by search type
`exa#search` SHALL accept `type` values `auto` (default), `lite`,
`instant`, `fast`, `neural`, `deep-lite`, `deep` and `deep-reasoning`, and
SHALL meter the base price as one PER_UNIT cell per published rate:
`lite_search` $0.004 (lite, instant, neural), `standard_search` $0.007
(auto, fast), `deep_search` $0.012 (deep-lite, deep) and
`deep_reasoning_search` $0.015 (deep-reasoning), each covering the first
10 results. `additional_result` SHALL meter $0.001 per result above 10 and
`summary` $0.001 per returned result carrying a summary. Exa's
`costDollars.total` SHALL settle the run (provider consolidate).
`exa#search` SHALL use a 180 s request timeout and 190 s run timeout so
that deep types can complete; provider defaults SHALL remain unchanged.

#### Scenario: A default search is billed at the auto rate
- **WHEN** `exa#search` runs with no `type` and returns 3 results
- **THEN** evidence is `{standard_search: 1}`

#### Scenario: Instant with extra results and summaries
- **WHEN** the estimate runs for `type: "instant"`, `numResults: 12`,
  `contents.summary: {}`
- **THEN** evidence is `{lite_search: 1, additional_result: 2,
  summary: 12}` and credits are $0.018

## ADDED Requirements

### Requirement: Lite search endpoint
The connector SHALL provide `exa#search/lite` (public path
`/search/lite`, wire `POST /search`, `web-search`) whose body accepts only
`query`, `numResults`, `category`, `includeDomains`, `excludeDomains`,
`startPublishedDate`, `endPublishedDate`, `userLocation`, `moderation`,
`compliance` (`"hipaa"` or null) and `contents` (`text`, `highlights`,
`snapshotAsOf`). `snapshotAsOf` SHALL accept an ISO 8601 date-time, a
`YYYY-MM-DD` date (midnight UTC), or null. Both new fields are optional.
Unsupported fields, including a
caller-supplied `type`, SHALL fail with `INVALID_INPUT` before any upstream
call. Accepted requests SHALL carry `type: "lite"`. It SHALL bill PER_CALL
$0.004 flat and cap `numResults` at 10 at the binding (default 10).
The compiled `numResults` description SHALL be "Number of results (1-10)."
Lite metadata SHALL note that `contents.snapshotAsOf` does not support
`category`, matching the current Snapshot documentation.
The compiler SHALL synthesize the empty estimate/evidence functions.

#### Scenario: A lite search costs $0.004
- **WHEN** `exa#search/lite` returns 200 with 3 results and
  `costDollars.total` 0.004
- **THEN** usage is `{credits: {default: 0.004}, evidence: {CALL: 1}}`
  with no mismatch

#### Scenario: Unsupported fields are rejected before the wire
- **WHEN** the body carries `type: "deep"`, `stream`, `outputSchema`, or
  `contents.summary`
- **THEN** the run fails with `INVALID_INPUT` and no upstream call

#### Scenario: Lite result limit
- **WHEN** `numResults` is 11
- **THEN** the run fails with `INVALID_INPUT` and no upstream call
- **AND** the near-twin with 10 results is accepted

#### Scenario: Lite estimate is flat
- **WHEN** any accepted lite input is estimated
- **THEN** usage is `{credits: {default: 0.004}, evidence: {CALL: 1}}`

### Requirement: Deep search endpoint
The connector SHALL provide `exa#search/deep` (public path
`/search/deep`, wire `POST /search`, `web-search`) whose binding accepts
only `deep-lite` and `deep` (default), caps `numResults` at 10 (default
10), and omits `summary` from strict contents options. It SHALL retain
its 180 s request budget and bill flat PER_CALL $0.012. Its compiled
`numResults` description SHALL be "Number of results (1-10)." The compiler
SHALL synthesize the empty estimate/evidence functions. Deep-reasoning,
more results and result summaries remain available on `exa#search`.

#### Scenario: Structured output with grounding
- **WHEN** `exa#search/deep` runs with an `outputSchema` and no `type`
- **THEN** output carries `output.content` and `output.grounding`, and
  usage is `{credits: {default: 0.012}, evidence: {CALL: 1}}`

#### Scenario: Deep flat-price limits are enforced
- **WHEN** the body carries `type: "deep-reasoning"`, `numResults: 11`,
  or `contents.summary`
- **THEN** the run fails with `INVALID_INPUT` and no upstream call
- **AND** the near-twins `type: "deep-lite"`, `numResults: 10`, and
  `contents.highlights: true` are accepted

#### Scenario: Deep estimate is flat
- **WHEN** any accepted deep input is estimated
- **THEN** usage is `{credits: {default: 0.012}, evidence: {CALL: 1}}`
