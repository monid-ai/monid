# clawifi-connector (delta)

## ADDED Requirements

### Requirement: Clawifi provider definition
The clawifi provider SHALL declare name `clawifi`, `request.baseUrl`
`https://api.clawifi.dev`, auth `presets.auth.bearer()`, the static
request header `X-Clawifi-Include-Credits: 1`, a single `default` credit
pool labelled "Clawifi credits", a provider `usage.consolidate` that
plucks top-level `credits_charged` out of the payload (entry omitted when
absent), and a provider `output.fromError` that reads `error.message`,
`error.code` and `error.retryable`.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `clawifi#search/free`, `clawifi#fetch`,
  `clawifi#scrape` and `clawifi#map` exist, and every one carries
  `request.headers["X-Clawifi-Include-Credits"] = "1"`

#### Scenario: Unexposed fields never reach the wire
- **WHEN** a `clawifi#fetch` run passes `requires_auth` or `proxy_config`
- **THEN** the request body sent upstream does not contain them

### Requirement: The vendor meter settles; zero-cost answers derive zero
Every endpoint SHALL settle on Clawifi's `credits_charged` claim when it
is non-zero. Because a zero claim falls back to the derived fold, the
fold SHALL derive 0 wherever Clawifi charges 0 on a 2xx: `fetch` and
`scrape` SHALL count nothing on `cache_hit: true`. `search/free` SHALL be
a flat PER_CALL 1. `fetch` SHALL be COMPOSITE `page` (1), `browser_render`
(2, when `mode_used` is `browser` or `session_browser`) and `pdf_page`
(2 per started 50 pages read, replacing `page`). `scrape` SHALL be
COMPOSITE `page` and `browser_render`. `map` SHALL be PER_UNIT RESULT
with `every: 10` counting `max(1, urls.length)`.

#### Scenario: Plain fetch
- **WHEN** a `clawifi#fetch` run returns 200 with `credits_charged: 1`,
  `mode_used: "http_fetch"`, `cache_hit: false`
- **THEN** usage is `{credits: {default: 1}, evidence: {page: 1}}`

#### Scenario: Cache hit is free
- **WHEN** a `clawifi#fetch` or `clawifi#scrape` run returns 200 with
  `cache_hit: true` and `credits_charged: 0`
- **THEN** usage is `{credits: {}, evidence: {page: 0}}`

#### Scenario: PDF
- **WHEN** a `clawifi#fetch` run reads a 64-page PDF and reports
  `credits_charged: 4`
- **THEN** usage is `{credits: {default: 4}, evidence: {page: 0,
  pdf_page: 64}}`

#### Scenario: Map floor
- **WHEN** a `clawifi#map` run returns 0 URLs with `credits_charged: 1`
- **THEN** usage is `{credits: {default: 1}, evidence: {RESULT: 1}}`

#### Scenario: Errors are free
- **WHEN** Clawifi answers 401
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}`

### Requirement: Faithful input mirrors
Bodies SHALL mirror Clawifi's pydantic request models (`SearchFreeRequest`,
`FetchRequest`, `ScrapeRequest` + `ScrapeFormatOption`, `MapRequest`),
non-strict like the vendor, with the vendor's single-field bounds;
`query`/`url` required. The typed scrape format option SHALL be strict
(`extra="forbid"` upstream). `map` SHALL default `max_urls` to 100 at the
binding.

#### Scenario: Bounds enforced before the wire
- **WHEN** a caller passes `top_k: 21` to `clawifi#fetch` or
  `max_urls: 1001` to `clawifi#map`
- **THEN** the run fails with INVALID_INPUT before any network call
