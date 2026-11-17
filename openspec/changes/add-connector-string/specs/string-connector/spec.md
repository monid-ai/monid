# string-connector (delta)

## ADDED Requirements

### Requirement: String provider definition

The string provider SHALL declare name `string`, display name "String Web
Access", `request.baseUrl` `https://request.usestring.ai/v1`, auth
`presets.auth.bearer()`, and one credit pool `default` labelled "US dollars
(Growth-tier rate)". No provider-level lifecycle or `usage.consolidate` — no
endpoint carries a settle-time cost receipt on the response body.

### Requirement: Search bills per results page, one page unless paging is requested

`POST /search` SHALL offer `engine` `google` and `google_ai_mode` at the
binding, defaulting to `google`. It SHALL model usage as a `COMPOSITE` of
two `PER_UNIT`·`PAGE` lines at the Growth-tier search rate ($0.001):
`search` and `ai_overview`. The estimate SHALL hold 1 `search` page when
`searchCount` is absent or the engine is not `google`, else the documented
36-page cap (an admission hold that settlement can never exceed), and 1
`ai_overview` exactly when `aiOverview` is true. Evidence SHALL settle
`search` from `paging.pages` when the response carries it, else 1, and
`ai_overview` as the estimate does — except that a search that comes back
with nothing SHALL settle both lines at 0: a response with
`zeroResults: true`, or one whose `results` and every other field but
`zeroResults` and `paging` are empty.

#### Scenario: No searchCount settles at exactly one page

- **WHEN** `POST /search` with `{query: "..."}` (no `searchCount`) returns a
  results body with no `paging` field
- **THEN** usage is
  `{credits: {default: 0.001}, evidence: {search: 1, ai_overview: 0}}`

#### Scenario: A paged search settles at the pages that answered

- **WHEN** `POST /search` with `{query: "...", searchCount: 30}` returns a
  body whose `paging.pages` is 3
- **THEN** usage evidence is `{search: 3, ai_overview: 0}`

#### Scenario: aiOverview bills one search more

- **WHEN** `POST /search` with `{query: "...", aiOverview: true}` returns
  one results page
- **THEN** usage is
  `{credits: {default: 0.002}, evidence: {search: 1, ai_overview: 1}}`

#### Scenario: A search that comes back with nothing settles at zero

- **WHEN** `POST /search` returns 200 with `{results: [], zeroResults:
  false}` and no other field, or with `zeroResults: true`
- **THEN** usage evidence is `{search: 0, ai_overview: 0}` and no credit is
  charged

#### Scenario: An answer without organic results still bills

- **WHEN** `POST /search` with `engine: "google_ai_mode"` returns an empty
  `results` beside an `aiMode` answer
- **THEN** usage evidence is `{search: 1, ai_overview: 0}`

#### Scenario: engine defaults to google and offers only google and AI Mode

- **WHEN** the compiled input schema for `search` is inspected
- **THEN** the schema's `engine` property has default `"google"` and enum
  `["google", "google_ai_mode"]`

### Requirement: Fetch reads with a GET and bills one of five output-determined rates

`string#fetch` SHALL bind `POST /fetch` with only `url`, `format`,
`executeJS`, `headers`, `countryCode` and `solveCaptcha` on its strict input
schema — no `method`, `body`, browser actions, screenshots or `jsonSchema`
— and SHALL default `format` to `markdown` and `solveCaptcha` to `false`.
It SHALL declare a single-tick `lifecycle.start` (no `poll`) that performs
the request, stashes the response header `x-billed-request-type` on
`state.data.billedRequestType`, and completes with the raw response body as
output. `usage.model` SHALL be a `COMPOSITE` of five `PER_UNIT`·`RESULT`
components — `request_standard` ($0.0002), `request_premium` ($0.002),
`browser_standard` ($0.001), `browser_premium` ($0.004) and `search`
($0.001) — each the Growth-tier rate for that billed type.
`usage.estimate` SHALL promise the standard-proxy component on whichever
strategy the request itself forces (`browser_standard` when `executeJS` is
set, `request_standard` otherwise). `usage.evidence` SHALL settle the one
component of the doc's own model that `state.data.billedRequestType` names,
or no component when the value is absent or names none of them.

#### Scenario: A plain read goes out as Markdown with challenge solving off

- **WHEN** `string#fetch` runs with `{url: "https://example.com"}`
- **THEN** the body sent to `/fetch` is
  `{url: "https://example.com", format: "markdown", solveCaptcha: false}`

#### Scenario: A plain fetch settles at the request-standard rate

- **WHEN** `string#fetch` with `{url: "https://example.com"}` returns 200
  with response header `x-billed-request-type: request_standard`
- **THEN** usage is
  `{credits: {default: 0.0002}, evidence: {request_standard: 1}}`

#### Scenario: A browser-rendered fetch settles at the browser-premium rate, not the cheap-floor estimate

- **WHEN** `string#fetch` with `{url: "https://example.test", executeJS:
  true}` returns 200 with response header
  `x-billed-request-type: browser_premium`
- **THEN** the pre-call estimate names `browser_standard` (the honest
  floor) but the settled usage is
  `{credits: {default: 0.004}, evidence: {browser_premium: 1}}`

#### Scenario: A Google results URL settles at the search rate

- **WHEN** `string#fetch` returns 200 with response header
  `x-billed-request-type: search`
- **THEN** usage is `{credits: {default: 0.001}, evidence: {search: 1}}`

#### Scenario: A missing billed-type header settles zero rather than guessing

- **WHEN** `string#fetch` completes but the transport does not surface
  `x-billed-request-type` on the response
- **THEN** usage evidence is `{}` and no credit line is charged

### Requirement: Request sends a POST, PUT or PATCH and bills a request-based rate

`string#request` SHALL declare `endpoint: "/request"` and bind
`POST /fetch`, with `method` REQUIRED and one of `POST`, `PUT` or `PATCH`,
plus `url`, `body`, `format`, `headers`, `countryCode` and `solveCaptcha` on
its strict input schema — no `executeJS` or browser actions — and SHALL
default `format` to `json` and `solveCaptcha` to `false`. Its
`lifecycle.start` and `usage.evidence` SHALL be byte-identical to
`string#fetch`'s, interning to the same fnTable entries. `usage.model`
SHALL be a `COMPOSITE` of the two request-based components,
`request_standard` ($0.0002) and `request_premium` ($0.002), and
`usage.estimate` SHALL promise `request_standard`.

#### Scenario: A POST settles at the billed request-based rate

- **WHEN** `string#request` with `{url, method: "POST", body}` returns 200
  with response header `x-billed-request-type: request_premium`
- **THEN** usage is
  `{credits: {default: 0.002}, evidence: {request_premium: 1}}`

#### Scenario: A GET is refused before anything is sent

- **WHEN** `string#request` is called with `method: "GET"`
- **THEN** the run fails with `INVALID_INPUT` and no request reaches
  `/fetch`

#### Scenario: A billed type outside the request lines settles zero

- **WHEN** `string#request` returns 200 with response header
  `x-billed-request-type: browser_premium`
- **THEN** usage evidence is `{}` and no credit line is charged

### Requirement: Test fixtures can record the billing-determining header

`shared/testing/fixtures.ts`'s `RECORDED_RES_HEADERS` allowlist SHALL
include `x-billed-request-type`, so a recorded fixture chain can carry the
one response header the `fetch` and `request` billing models read.

#### Scenario: A fixture with the billed-type header is accepted

- **WHEN** a fixture's recorded response includes
  `headers: {"x-billed-request-type": "browser_standard"}`
- **THEN** fixture validation accepts it, because that key is on the
  allowlist
