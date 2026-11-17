# mapsdata-connector (delta)

## ADDED Requirements

### Requirement: MapsData provider definition
The mapsdata provider SHALL declare name `mapsdata`, `request.baseUrl`
`https://mapsdata.ai/api/v1`, auth `presets.auth.bearer()`, timeouts
30 s / 30 s, one credit pool `default` ("MapsData leads"), and a
provider-level `usage.model` of FREE. `mapsdata#jobs` SHALL override the
model with PER_UNIT `RESULT`, 1 lead per delivered row.

#### Scenario: A vendor error is data, zero usage
- **WHEN** any endpoint answers non-2xx with `{error: {code, message}}`
- **THEN** the run completes with that status, `isProviderError` true,
  usage `{credits: {}, evidence: {}}`, and the output carries `message`,
  `code` and `raw`

### Requirement: Scrape job
`mapsdata#jobs` SHALL submit `POST /jobs` with an `Idempotency-Key`
derived from the run id, poll `GET /jobs/{id}` until the status is
terminal, and on `completed` with `downloads.csv` true and a non-zero
`email_count`, fetch `GET /jobs/{id}/download?format=csv&scope=emails` and
then the signed URL it returns, and output `{job, leads}`.

#### Scenario: A completed scrape settles on the vendor meter
- **WHEN** the job completes with `email_count` 2 and the CSV holds 2 rows
- **THEN** output `leads` holds 2 header-keyed rows and usage is
  `{credits: {default: 2}, evidence: {RESULT: 2}}`

#### Scenario: Transient lookups keep the run alive
- **WHEN** the status lookup or the download-link mint answers 503
- **THEN** the run stays RUNNING and settles on a later tick

#### Scenario: No emails, no fetch, no charge
- **WHEN** the job completes with `email_count` 0
- **THEN** no download is requested, `leads` is empty, and nothing bills

#### Scenario: A failed scrape is zero-billed
- **WHEN** the job ends `failed` or `cancelled`
- **THEN** the run completes as a synthesized 500 over a provider 200,
  zero usage, with the vendor's `error_message` as the public message

#### Scenario: A dry run bills nothing
- **WHEN** the body carries `dry_run: true`
- **THEN** the submit's 200 plan settles the run at once and nothing bills

### Requirement: Free lookups
The connector SHALL provide `GET /categories` (`q` required),
`GET /categories/validate` (`name` required) and `GET /regions`
(`country` one of us, ca, uk, au), all FREE.

#### Scenario: Resolving a category is free
- **WHEN** `GET /categories/validate?name=plumbers` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}` and the output carries
  `canonical`

### Requirement: Shared-workspace isolation
The connector SHALL NOT expose any endpoint that reads, downloads, lists or
cancels a job by id, nor `client_id` on the submit body.
