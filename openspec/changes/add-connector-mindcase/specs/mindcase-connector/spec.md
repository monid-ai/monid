# mindcase-connector (delta)

## ADDED Requirements

### Requirement: Mindcase provider with one job lifecycle and the usd_used meter
The mindcase provider SHALL declare name `mindcase`, `request.baseUrl`
`https://api.mindcase.co`, auth `presets.auth.bearer()`, a provider
`input.toRequest` that sends the validated body as `{params: body}`, a
provider lifecycle (start, poll, stop) over `/v1/data/{group}/{slug}/run` and
`/v1/jobs/{id}`, credit pool `default` ("US dollars"), a provider
`usage.consolidate` that plucks `usd_used` out of the output, and an
`output.fromError` that digests `{detail}` and synthesized `{message}` bodies
into `{message, raw}`.

#### Scenario: A job completes and settles on the vendor claim
- **WHEN** the run is queued, polls `running` once, then `completed` with
  `usd_used: 0.002`, and `/results` returns 2 rows
- **THEN** the run settles 200 with `credits: {default: 0.002}`, the output is
  `{job_id, row_count: 2, data}` and `usd_used` is absent from it

#### Scenario: Inputs travel under params
- **WHEN** `#linkedin/jobs` runs with `{jobTitles, maxResults}`
- **THEN** the wire body is `{params: {jobTitles, maxResults}}`

#### Scenario: Terminal failures are zero-billed data
- **WHEN** the job ends `failed`, `cancelled` or `rejected_balance`, or the
  run request itself returns 401
- **THEN** the run completes with 500, 409, 402 or 401, `isProviderError`
  true and usage `{credits: {}, evidence: {}}`

#### Scenario: An empty job costs nothing
- **WHEN** the job completes with zero rows and `usd_used: 0`
- **THEN** the claim is empty and the fold over zero rows settles at zero

### Requirement: Row caps are required so every run can be priced
Each endpoint whose agent publishes a row-limit parameter SHALL require it at
the binding with a floor of 1 (or the vendor's own minimum), unless the
vendor publishes a default, and its estimate SHALL be that cap times the
per-row price, multiplied by the number of inputs when the cap is per input.

#### Scenario: Zero is rejected before the wire
- **WHEN** `#linkedin/jobs` runs with `maxResults: 0` or without `maxResults`
- **THEN** it fails `INVALID_INPUT` and nothing is sent

#### Scenario: People search prices its search pages and the profiles
- **WHEN** `#linkedin/profiles/search` is estimated with `maxProfiles: 50`
- **THEN** the evidence is `{search_page: 2, profile: 50}` ($0.05 per search page of 25)
