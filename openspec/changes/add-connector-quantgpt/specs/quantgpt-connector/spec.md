# quantgpt-connector (delta)

## ADDED Requirements

### Requirement: QuantGPT provider definition
The quantgpt provider SHALL declare name `quantgpt`, `request.baseUrl`
`https://terminal.quantgpt.co/api/v1`, auth `presets.auth.bearer()`, the
category `equities`, a single `default` credit pool labelled "US dollars",
and a provider-level `output.fromError` that reads `error` from the error
envelope.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `quantgpt#tools/market_snapshot`,
  `quantgpt#tools/grade_stock`, `quantgpt#tools/search_library` and
  `quantgpt#tools/run_backtest` exist

### Requirement: Flat per-call billing, one free endpoint
`market_snapshot` SHALL consume US$0.02, `grade_stock` US$0.03 and
`run_backtest` US$0.10 per successful call (leaf `PER_CALL`);
`search_library` SHALL be `FREE`. No `consolidate` (the vendor reports no
per-response meter; the derived fold is the bill).

#### Scenario: Flat settle
- **WHEN** a `quantgpt#tools/grade_stock` run returns 200
- **THEN** usage is `{credits: {default: 0.03}, evidence: {CALL: 1}}`

#### Scenario: Free endpoint
- **WHEN** a `quantgpt#tools/search_library` run returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`

#### Scenario: Errors are free
- **WHEN** the vendor answers 400, 404 or 429
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}`

### Requirement: run_backtest start/poll lifecycle billed once per finished run
`run_backtest` SHALL carry `lifecycle.start` and `lifecycle.poll` and no
`lifecycle.stop`; the three synchronous endpoints SHALL carry no
lifecycle. `start` SHALL relay the submit: a non-2xx is COMPLETED data; a
2xx whose `result.status` is not `running` is COMPLETED 200; a 2xx running
answer SHALL park RUNNING with `externalRunId` = `result.job_id` (a running
answer without a job id throws). `poll` SHALL `POST {job_id}` to
`fetch_job` beside the doc's request URL; a running answer SHALL stay
RUNNING; 429, 500, 502, 503, 504 and 520 to 524 SHALL stay RUNNING with
`pollAfterMs` 30000; any other non-2xx SHALL be COMPLETED data; a finished
2xx SHALL be COMPLETED 200.

#### Scenario: Fast run
- **WHEN** the submit answers the finished report
- **THEN** no poll is made and usage is
  `{credits: {default: 0.1}, evidence: {CALL: 1}}`

#### Scenario: Slow run
- **WHEN** the submit answers running, one poll answers running, and the
  next delivers the report
- **THEN** neither running answer carries usage and the run settles
  `{credits: {default: 0.1}, evidence: {CALL: 1}}` once

#### Scenario: Job failed
- **WHEN** `fetch_job` answers 400 `job failed: ...`
- **THEN** the run completes as provider-error data with zero usage and
  the vendor's message

#### Scenario: Abandoned
- **WHEN** a running job is stopped
- **THEN** the stop verdict is `STOPPED_UNSETTLED` and nothing is billed

### Requirement: Faithful, strict input mirrors
Each body SHALL mirror the tool's published inputSchema, with the
vendor's own bounds and enums, and SHALL be strict at the binding (an
unknown key fails INVALID_INPUT). `grade_stock` SHALL require a
non-blank `ticker`.
