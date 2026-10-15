# twittrapi-connector (delta)

## ADDED Requirements

### Requirement: TwittrAPI provider definition
The twittrapi provider SHALL declare name `twittrapi`, `request.baseUrl`
`https://api.twittrapi.com`, auth `presets.auth.header("X-API-KEY")`,
static `Accept: application/json` and `User-Agent` headers, a single
`default` credit pool labelled "US dollars", a provider-level
`input.toRequest` that appends `format=simple`, joins array query values
with commas and JSON-encodes object query values, and a provider-level
`output.fromError` that reads `error` (and `errorCode` when present).

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly these 18 ids exist: `twittrapi#search`,
  `twittrapi#simpletweet/{tweetId}`, `twittrapi#tweet/{tweetId}`,
  `twittrapi#tweet/{tweetId}/quotes`, `twittrapi#tweet/{tweetId}/retweets`,
  `twittrapi#user/by/username/{username}`, `twittrapi#user/users/by/ids`,
  `twittrapi#user/about/{username}`, `twittrapi#user/{userId}/tweets`,
  `twittrapi#user/{userId}/tweets-and-replies`,
  `twittrapi#user/{userId}/media`, `twittrapi#user/{userId}/followers`,
  `twittrapi#user/{userId}/followings`,
  `twittrapi#user/{userId}/verified-followers`, `twittrapi#lists/tweets`,
  `twittrapi#lists/members`, `twittrapi#trends/{locationId}`,
  `twittrapi#communities/search/{searchTerm}`

#### Scenario: The simple format is always requested
- **WHEN** any twittrapi endpoint runs
- **THEN** the wire URL carries `format=simple` and the output is the
  vendor's simple envelope, unchanged

### Requirement: Per-page billing in dollars
Every endpoint SHALL inherit one `PER_UNIT · PAGE` line drawing $0.0001 of
the `default` pool (the vendor's Standard tier, $0.10 per 1,000 calls,
https://www.twittrapi.com/pricing.json, captured 2026-10-15). The estimate
SHALL be one page; the evidence SHALL count 1 when the response's `data` is
a non-empty array or an object and 0 otherwise. No `consolidate`.

#### Scenario: Page with results
- **WHEN** a `twittrapi#user/{userId}/followers` run returns 200 with users
  in `data`
- **THEN** usage is `{credits: {default: 0.0001}, evidence: {PAGE: 1}}`

#### Scenario: Empty success is free
- **WHEN** a run returns 200 with `data: []` or `data: null`
- **THEN** usage is `{credits: {}, evidence: {PAGE: 0}}`

#### Scenario: Errors are free
- **WHEN** the vendor answers 401 or 422
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}`

### Requirement: Faithful, strict input mirrors
Inputs SHALL mirror the vendor OpenAPI (optionality only, no binding
defaults), without the `format` knob, and every declared params object SHALL
be strict. `search` SHALL require `searchItem` or `filters` (a union), with
`filters` a strict object of the documented filter keys. Path ids SHALL carry
the vendor's patterns (tweet id digits, handle `^@?[A-Za-z0-9_]{2,15}$`,
user id digits or `-1`), `ids` SHALL hold 1 to 500 digit strings, and the
lookups without query parameters SHALL declare an empty strict query schema.

#### Scenario: Unknown key rejected
- **WHEN** a caller passes an unknown query key (or `format`) to any
  twittrapi endpoint
- **THEN** the run fails with INVALID_INPUT before any network call

#### Scenario: Search without a query
- **WHEN** a caller passes neither `searchItem` nor `filters` to
  `twittrapi#search`
- **THEN** the run fails with INVALID_INPUT before any network call
