# hirebase-connector

## ADDED Requirements

### Requirement: Per-record billing on search endpoints

`hirebase#jobs/search`, `hirebase#jobs/neural-search`,
`hirebase#companies/{company_slug}/jobs` and `hirebase#companies/search` SHALL bill one unit of the matching pool (`jobs` or
`companies`) per record returned, and SHALL estimate at the caller's required
`limit`.

#### Scenario: a search returns fewer rows than the limit

- **WHEN** a job search with `limit: 5` returns 2 jobs
- **THEN** usage is `{credits: {jobs: 2}, evidence: {RESULT: 2}}`

#### Scenario: a search matches nothing

- **WHEN** a job search returns an empty `jobs` array
- **THEN** usage carries no credits

### Requirement: Flat billing on lookups, insights and benchmarks

`hirebase#jobs/{job_id}` SHALL bill 1 `jobs` unit,
`hirebase#companies/{company_slug}` 1 `companies` unit,
`hirebase#jobs/insights` 1 `insights` unit and
`hirebase#jobs/salary-benchmark` 1 `salary_benchmarks` unit per successful call.

#### Scenario: an unknown job id

- **WHEN** the vendor answers 404
- **THEN** the run is a provider error with zero usage

### Requirement: Free sizing and sync endpoints

`hirebase#jobs/estimate` and `hirebase#jobs/expired-jobs` SHALL bill nothing.

#### Scenario: counting a search

- **WHEN** an agent calls `hirebase#jobs/estimate` with `limit: 0`
- **THEN** the output is `{cost: n}`, the total match count, with empty usage

### Requirement: Strict inputs

Every request body SHALL reject unknown fields before the wire, including
inside neural search's `vector` and `lexical` objects.

#### Scenario: a misspelled filter

- **WHEN** a caller sends `job_type` instead of `job_types`
- **THEN** the run fails with `INVALID_INPUT` and no vendor call is made

### Requirement: Salary benchmark runs to completion

`hirebase#jobs/salary-benchmark` SHALL queue the report, poll the task until it
is `finished`, and return the report without the task's queue bookkeeping. A
`failed` or `canceled` task SHALL settle as a provider error with zero usage.

#### Scenario: the task finishes

- **WHEN** the task reaches `finished`
- **THEN** the output is `{task_id, input, report}` and usage is 1
  `salary_benchmarks` unit

### Requirement: Readable errors

Vendor errors SHALL be returned as `{message, raw}`, where `message` is the
vendor's `detail` sentence, or a single line built from a list-shaped `detail`.

#### Scenario: an invalid key

- **WHEN** the vendor answers 401 `{"detail": "Invalid API key"}`
- **THEN** the output is `{message: "Invalid API key", raw: {...}}` with zero
  usage
