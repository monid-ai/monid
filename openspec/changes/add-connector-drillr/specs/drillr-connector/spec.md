# drillr-connector (delta)

## ADDED Requirements

### Requirement: Twelve endpoints, one key, one pool
The drillr provider SHALL declare name `drillr`, `request.baseUrl`
`https://gateway.drillr.ai/api/v2`, auth
`presets.auth.header("X-API-KEY")`, timeouts 60 s request / 60 s run, and one
credit pool `default` ("drillr credits"). Every endpoint id SHALL be
`drillr#<path minus its leading slash>`. The provider SHALL NOT declare a
lifecycle, an `input.toRequest`, an `output.fromResponse` or a
`usage.consolidate`.

#### Scenario: The compiled set
- **WHEN** the bundle compiles
- **THEN** exactly these ids exist under `drillr#`: `balance-sheets`,
  `cash-flow-statements`, `company-discovery`, `earnings-calendar`, `events`,
  `filing-search`, `filings`, `financial-metrics-snapshot`,
  `income-statements`, `insider-trades`, `news-search`, `tickers`

#### Scenario: No vendor meter
- **WHEN** any drillr doc is inspected
- **THEN** `usage.consolidate` is undefined and the estimate fn's provenance
  is `core#usage.synthesizedEmpty`

#### Scenario: The slow endpoint keeps its documented timeout
- **WHEN** `drillr#company-discovery` is inspected
- **THEN** `timeouts.requestMs` is 90000

### Requirement: Each endpoint bills the published flat REST rate
Every endpoint SHALL price one `PER_CALL` line against the `default` pool at
drillr's REST rate: `company-discovery` 3, `news-search` 0.2,
`filing-search` 0.1, and each of the other nine 0.02.

#### Scenario: A data call
- **WHEN** `GET /income-statements?ticker=AAPL&period=FY&limit=2` returns 200
- **THEN** usage is `{credits: {default: 0.02}, evidence: {CALL: 1}}`

#### Scenario: A multi-ticker request is one call
- **WHEN** `GET /financial-metrics-snapshot?ticker=AAPL,7203.T` returns two
  rows
- **THEN** usage is `{credits: {default: 0.02}, evidence: {CALL: 1}}`

#### Scenario: Company discovery
- **WHEN** `GET /company-discovery` returns 200
- **THEN** usage is `{credits: {default: 3}, evidence: {CALL: 1}}`

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** `GET /events?ticker=7203.T` returns 404
  `{error: "not_found", message}`
- **THEN** `isProviderError` is true, usage is
  `{credits: {}, evidence: {}}`, and the output is the vendor's envelope
  unchanged

### Requirement: Inputs mirror the documented parameters without translation
Every `schema/inputs.ts` SHALL mirror the parameter table of its
drillr.ai/docs/api page — names, types, enums and required-versus-optional —
with no `.default()` and no invented field, and SHALL be `.strict()`.
Multi-value parameters SHALL be one comma-separated string, as drillr reads
them; a closed vocabulary SHALL compile to a `pattern`.

#### Scenario: Required parameters
- **WHEN** the compiled schemas are inspected
- **THEN** the required sets are: `filings`, the three statements,
  `financial-metrics-snapshot` and `insider-trades` `[ticker]`;
  `filing-search` `[query, ticker]`; `company-discovery` `[query]`;
  `earnings-calendar` `[from, to]`; `tickers`, `events` and `news-search`
  none

#### Scenario: An unknown parameter is refused before the wire
- **WHEN** `drillr#filings` runs with `queryParams: {ticker: "AAPL",
  form_type: "10-K"}`
- **THEN** the run fails `INVALID_INPUT` — `/filings` has no form-type
  parameter

#### Scenario: A value outside a closed vocabulary is refused
- **WHEN** `drillr#tickers` runs with `market: "HK"`
- **THEN** the run fails `INVALID_INPUT`

#### Scenario: News search posts a JSON body
- **WHEN** `drillr#news-search` runs with
  `body: {query: "export controls", ticker: "NVDA", top_k: 2}`
- **THEN** the engine issues `POST /news-search` with that body and no query
  string

### Requirement: Meta tells an agent which endpoint to call and what it covers
The provider `notes` SHALL state the canonical ticker form per market and
that names are resolved with `/tickers` first. Each endpoint's
`description` SHALL name what the rows contain and its market coverage, and
`/events` and `/insider-trades` SHALL state that they are US only.

#### Scenario: Notes concatenate
- **WHEN** `drillr#events` is inspected
- **THEN** `meta.notes` holds the five provider notes followed by the
  endpoint's own, the first of which begins "US only."
