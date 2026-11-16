# specstream-connector (delta)

## ADDED Requirements

### Requirement: SpecStream provider definition
The specstream provider SHALL declare name `specstream`,
`request.baseUrl` `https://api.specstream.ai`, auth
`presets.auth.bearer()`, timeouts 60 s / 65 s, one credit pool `default`
("US dollars"), and an `output.fromError` that maps the vendor envelope
`{ error: { code, message } }` to `{ message, code, raw }`.

#### Scenario: A refused key is data, zero usage
- **WHEN** an endpoint is called with a missing or invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and the output carries the vendor
  `message` and `code`

### Requirement: Two endpoints
The connector SHALL provide `POST /v1/web-search`
(`specstream#v1/web-search`, categories `web-search`, `news-search`) and
`POST /v1/extract` (`specstream#v1/extract`, categories `web-scraping`,
`web-extraction`).

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `specstream#v1/extract` and `specstream#v1/web-search`
  exist under `specstream#`

### Requirement: Input gates
`v1/web-search` SHALL require `q` (1 to 2000 characters) and accept
optional `speed` (`default` | `fast`), `num` (integer 1 to 100), `page`
(integer 1 to 10), `passages` (boolean), `news` (boolean), `language`
(2-letter ISO 639-1), `country` (2-letter ISO 3166-1), and `safe`
(`off` | `moderate` | `strict`). `v1/extract` SHALL require `urls`
(1 to 20 strings, each 1 to 4000 characters) and accept optional `format`
(`markdown` | `text` | `html`) and `include` (`html`, `links`,
`response`, `full_text`).

#### Scenario: The gates reject near-twins
- **WHEN** `q` is empty or 2001 characters, `num` is 0 or 101, `page` is
  11, `speed` is `slow`, `country` is `DEU`, or `urls` has 0 or 21 items
- **THEN** the call is rejected with INVALID_INPUT
- **AND** `q` of 2000 characters, `num: 100`, `page: 10`, and 20 `urls`
  are accepted

### Requirement: Receipt billing in hundredths of a cent
Both endpoints SHALL declare a `PER_UNIT` model on `Unit.CREDIT`
consuming `0.0001` of the `default` pool per unit; `usage.consolidate`
SHALL settle `data.price_usd`, omitting the entry when absent;
`usage.evidence` SHALL report `Math.round(price_usd * 10000)`.
`v1/web-search` SHALL estimate 50 units (10 for `speed: "fast"` or
`news: true`) plus 60 (12 for fast/news) per started block of 10 results
beyond 10. `v1/extract` SHALL estimate `8 * urls.length`.

#### Scenario: Answered search settles on its receipt
- **WHEN** `v1/web-search` returns 200 with `data.price_usd: 0.005`
- **THEN** usage is `{credits: {default: 0.005}, evidence: {CREDIT: 50}}`
- **AND** there is no `usage.mismatch`

#### Scenario: Fast search settles at the fast price
- **WHEN** `v1/web-search` with `speed: "fast"` returns 200 with
  `data.price_usd: 0.001`
- **THEN** usage is `{credits: {default: 0.001}, evidence: {CREDIT: 10}}`

#### Scenario: Extract bills only pages that yield text
- **WHEN** `v1/extract` is called with 2 URLs (1 valid, 1 invalid) and
  returns 200 with `data.price_usd: 0.0008`
- **THEN** estimate is `{credits: {default: 0.0016}, evidence: {CREDIT: 16}}`
- **AND** settled usage is `{credits: {default: 0.0008}, evidence: {CREDIT: 8}}`

#### Scenario: Refused search is data, zero usage
- **WHEN** `v1/web-search` answers 422 with an error envelope
- **THEN** the run completes as HTTP 422, `isProviderError` true, and
  usage `{credits: {}, evidence: {}}`
