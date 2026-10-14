# hunterio-discovery (delta)

## ADDED Requirements

### Requirement: Structured discovery accepts documented hiring filters

`hunterio#discover` and `hunterio#discover/people` SHALL accept an optional
`job_openings` object containing optional boolean `hiring`, string-array
`department`, `job_title` include/exclude keyword arrays, `posted_date` in
`last7d` / `last30d` / `last90d`, integer `open_roles.from` / `to`, and boolean
`include_closed_roles`. Each job-title keyword array SHALL accept at most 100
entries. The mirror SHALL NOT materialize defaults.

#### Scenario: Hiring is the only filter
- **WHEN** the caller supplies `{job_openings: {hiring: true}}`
- **THEN** input validation accepts the request without another company filter

#### Scenario: Hiring combines with an existing filter
- **WHEN** the caller supplies an organization filter and valid `job_openings`
- **THEN** both filters are accepted and retained in the outgoing JSON body

#### Scenario: Malformed hiring fields fail before HTTP
- **WHEN** a hiring flag is a string, department is a scalar, the posting
  window is unsupported, an open-role bound is fractional, or a keyword array
  exceeds 100 entries
- **THEN** the engine rejects the request with `INVALID_INPUT` before transport

### Requirement: Existing request and settlement behavior is preserved

Both tools SHALL retain their POST routes and provider-injected credentials.
The validated hiring object SHALL reach the HTTP body unchanged. Successful
responses SHALL pass through unchanged and usage SHALL remain
`{credits: {}, evidence: {}}`, including successful empty searches.

#### Scenario: Recorded engineering hiring search
- **WHEN** the recorded `hiring` fixture is replayed on either tool
- **THEN** the run completes with HTTP 200, preserves the non-empty company
  list and applied-filter metadata, and records zero usage

#### Scenario: Recorded impossible-title search
- **WHEN** the recorded `hiring-empty` fixture is replayed on either tool
- **THEN** the run succeeds with an empty company list, zero matching results,
  the title filter preserved in metadata, and zero usage

#### Scenario: Existing filters remain usable
- **WHEN** an existing valid discovery input omits `job_openings`
- **THEN** it retains its existing validation, request and settlement behavior
