# lev8-connector (delta)

## ADDED Requirements

### Requirement: Lev8 provider definition
The lev8 provider SHALL declare name `lev8`, `request.baseUrl`
`https://app.lev8.com`, auth `presets.auth.bearer()`, one credit pool
`default` ("Lev8 credits"), and NO `usage.consolidate`. Every paid call
SHALL carry `Idempotency-Key: {runId}:<op>`, unique per run and stable
within it. `GET /v1/credit/balance` SHALL NOT be exposed.

#### Scenario: A retried run is not charged twice
- **WHEN** a run's start is retried by the host
- **THEN** both attempts send the same `Idempotency-Key`, so Lev8 replays
  the saved response without a second charge

#### Scenario: A 401 is data, zero usage
- **WHEN** any endpoint is called with an invalid token
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and Lev8's error envelope rides through

### Requirement: Entity Search drives the whole task in one run
`lev8#v1/entity-search` SHALL post to `/v1/entity-search/create_task`,
poll `/v1/entity-search/status` until `done` or `error`, then page
`/v1/entity-search/fetch` until `ready_count` entities are read, and return
`{leads_search_id, status, stop_reason?, ready_count, count, entities}`.
It SHALL bill startup (5, or 20 with `enable_web_search`) only on `done`,
plus `ready_count` × 2 (10 for `*_creator` types).

#### Scenario: A finished company search
- **WHEN** a `company` search ends `done` with `ready_count` 3
- **THEN** usage is `{credits: {default: 11}, evidence: {startup: 5,
  results: 3}}` and all three entities are returned

#### Scenario: An errored task with results
- **WHEN** the task ends `error` with `ready_count` 1
- **THEN** the run settles 200 with that entity and usage
  `{credits: {default: 2}, evidence: {startup: 0, results: 1}}`

#### Scenario: An errored task with no results
- **WHEN** the task ends `error` with `ready_count` 0
- **THEN** the run settles as a 500 provider error at zero usage

#### Scenario: A failed status lookup
- **WHEN** `status` answers 408, 429 or 5xx
- **THEN** the poll throws (retriable) instead of settling

### Requirement: Synchronous endpoints bill only on success
Contact Search SHALL bill 10 credits per email found and 30 per phone
found, 0 when `result.content` is null, empty or whitespace. Deep Search
and Enrich SHALL bill 2 credits when `success` is true and 0 otherwise.
Extract SHALL bill social and GitHub lists 1 credit per 5 returned items,
rounded up, and `web2list` 80 per successful page; `success: false` bills
0.

#### Scenario: A social list
- **WHEN** `x_followers` returns 7 items
- **THEN** usage is `{credits: {default: 2}, evidence: {list_items: 7}}`

#### Scenario: A business-level failure
- **WHEN** Deep Search answers 200 with `success: false`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

### Requirement: Strict inputs
Every request body SHALL reject fields outside Lev8's published schema.
Enum, length and count bounds from the OpenAPI SHALL be enforced before
the wire; cross-field rules (`xiaohongshu` / `wechat` need
`enable_web_search: true`; `web2list` needs `instruction`) SHALL be stated
in the endpoint notes.

#### Scenario: An unknown field
- **WHEN** a body carries a field Lev8 does not publish
- **THEN** the run fails INVALID_INPUT without a request
