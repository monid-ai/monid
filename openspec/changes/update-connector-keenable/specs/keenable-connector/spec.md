# keenable-connector (delta)

## MODIFIED Requirements

### Requirement: Keenable provider definition
The keenable provider SHALL declare name `keenable`, `request.baseUrl`
`https://api.keenable.ai`, auth `presets.auth.header("X-API-Key")`,
timeouts 30 s / 30 s, one credit pool `default` labelled
"US dollars", a provider-level `usage.model` of PER_CALL $0.001
(the published volume rate), and NO `usage.consolidate` (REST
responses carry no usage receipt). Search docs SHALL override the
model with PER_UNIT `RESULT`, $0.001, counting 0 for `results: []`.
Provider meta SHALL categorize `web-search`, `news-search`,
`academic-search`, and `web-scraping`.

#### Scenario: A search consumes the volume rate
- **WHEN** `POST /v1/search` returns 200 with two results
- **THEN** usage is `{credits: {default: 0.001}, evidence: {RESULT: 1}}`
- **AND** the payload still carries `query`, `results`, and the
  vendor-echoed `mode`

#### Scenario: An empty search is free
- **WHEN** `POST /v1/search` returns 200 with `results: []`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: A fetch consumes the volume rate
- **WHEN** `GET /v1/fetch?url=https://example.com` returns 200
- **THEN** usage is `{credits: {default: 0.001}, evidence: {CALL: 1}}`
- **AND** output carries `url`, `title`, and markdown `content`

#### Scenario: A 401 is data, zero usage
- **WHEN** either endpoint is called with a malformed API key
- **THEN** the run completes as HTTP 401, `isProviderError` true,
  usage `{credits: {}, evidence: {}}`, and the vendor envelope
  `{error, message}` rides through

### Requirement: Authenticated search and fetch surface
The connector SHALL provide `POST /v1/search` (`keenable#v1/search`,
`web-search` + `news-search`) and `GET /v1/fetch` (`keenable#v1/fetch`,
`web-scraping` + `web-extraction`), plus five presets that share those
vendor paths and pin `endpoint:`: `keenable#v1/search-news`
(`news-search`, `published_after` default `2d`),
`keenable#v1/search-as-of` (`web-search`, `query_time` required),
`keenable#v1/search-contents` (`web-search` + `web-extraction`,
`snippet_max_length` default `10000`), `keenable#v1/search-papers`
(`academic-search`, `snippet_max_length` default `10000`), and
`keenable#v1/fetch-answer` (`web-extraction`, `prompt` required).
Search input SHALL be a loose body: `query` required and
non-whitespace; `site`, `acquired_after`/`acquired_before`,
`published_after`/`published_before`, `query_time` (non-empty,
non-whitespace strings), `mode`, `snippet_max_length` (180–10000),
`max_results` (1–50) optional; unspecified keys SHALL pass through.
Fetch input SHALL be strict query params: `url` required (URI);
`max_chars` (≥1), `prompt` (1–2000 non-whitespace characters)
optional; `live` boolean defaulting to true. The keyless `/public`
twins SHALL NOT be exposed.

#### Scenario: Search mode is a request field
- **WHEN** `POST /v1/search` is called with `mode: "realtime"`
- **THEN** the body is accepted and sent

#### Scenario: Whitespace-only query is rejected
- **WHEN** `POST /v1/search` is called with `query: "   "`
- **THEN** the run fails INVALID_INPUT

#### Scenario: Fetch url is required
- **WHEN** `GET /v1/fetch` is called without `url`, or with a string
  that is not a URI
- **THEN** the run fails INVALID_INPUT

#### Scenario: Fetch live defaults to true
- **WHEN** `GET /v1/fetch` is called with a URL and no `live`
- **THEN** the request carries `live=true` and settles $0.001

#### Scenario: Indexed-only fetch is opt-in
- **WHEN** `GET /v1/fetch` is called with `live: false`
- **THEN** the request carries `live=false` and settles $0.001

#### Scenario: News preset defaults published_after
- **WHEN** `keenable#v1/search-news` is called with only `query`
- **THEN** the body sent includes `published_after: "2d"`

#### Scenario: Point-in-time search requires query_time
- **WHEN** `keenable#v1/search-as-of` is called without `query_time`
- **THEN** the run fails INVALID_INPUT

#### Scenario: Page answer requires prompt
- **WHEN** `keenable#v1/fetch-answer` is called without `prompt`
- **THEN** the run fails INVALID_INPUT

#### Scenario: Search-and-read defaults the long extract
- **WHEN** `keenable#v1/search-contents` is called with only `query`
- **THEN** the body sent includes `snippet_max_length: 10000`

#### Scenario: Paper search is academic-search
- **WHEN** the compiled catalog is inspected
- **THEN** `keenable#v1/search-papers` is categorized `academic-search`
  and its `snippet_max_length` default is 10000
