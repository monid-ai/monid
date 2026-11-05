# pressfront-connector (delta)

## ADDED Requirements

### Requirement: Pressfront provider definition
The pressfront provider SHALL declare name `pressfront`, `request.baseUrl`
`https://pressfront.co/api/v1`, auth `presets.auth.bearer()`, timeouts 30 s
request / 40 s run, credit pool `default` ("US dollars"), no consolidate (the
vendor reports no meter), and a provider-level `output.fromError` that
normalizes `{error, message}` into `{message, code?, raw}`. The provider SHALL
NOT declare a lifecycle.

#### Scenario: Error envelope
- **WHEN** an endpoint answers 404 `{error: "no_recent_trace", message}`
- **THEN** the run is a provider error with `code` `no_recent_trace`, the
  vendor's message, and zero usage

### Requirement: Instant check is a flat $0.49 that bills only an answer
`pressfront#instant/{handle}` SHALL be `GET /instant/{handle}` with a
`maxAgeHours` query parameter (1 to 72), priced PER_CALL 0.49. It SHALL be
async: `lifecycle.start` sends the call with `wait=20`; a 202 `searching`
parks RUNNING with the call's URL, and `lifecycle.poll` repeats that URL
until a non-202. Transient reads (429, 503, 504) SHALL keep it RUNNING.

#### Scenario: Answered
- **WHEN** the vendor answers 200 with a headline and a brief
- **THEN** usage credits are `{default: 0.49}`

#### Scenario: Not traced today
- **WHEN** the vendor answers 202 `searching`, then 202, then 200
- **THEN** the run settles 200 with `depth` `quick` and usage credits
  `{default: 0.49}`

#### Scenario: Not an answer
- **WHEN** the vendor answers 404 (the demo key's other names) or 502
  `search_failed`
- **THEN** usage is `{credits: {}, evidence: {}}`

### Requirement: Full trace is an async job billed once, on success
`pressfront#traces` SHALL submit `POST /traces {name}`, park RUNNING with the
returned `id`, poll `GET /traces/{id}?wait=20` until the status is `done` or
`thin`, then read `/traces/{id}/story` and `/traces/{id}/brief?format=json`
and settle the status body merged with `{id, story, brief}`, priced PER_CALL
4.99. Transient status reads (429, 5xx) SHALL keep the run RUNNING.

#### Scenario: Done
- **WHEN** the poll sees `running`, then `done`
- **THEN** the run settles 200 with the id, the story and the brief, and
  usage credits `{default: 4.99}`

#### Scenario: Failed
- **WHEN** the poll sees `failed`
- **THEN** the run settles as a synthesized 500 with providerHttpStatus 200
  and zero usage

### Requirement: Reading a trace
`pressfront#traces/{id}` SHALL be FREE. `pressfront#traces/{id}/{part}` SHALL
be PER_CALL 0.05 with `part` one of brief, story, accounts, posts, timeline,
groups, who, sites, evidence.

#### Scenario: A part read
- **WHEN** `accounts` is read with `limit` 2
- **THEN** two accounts come back and usage credits are `{default: 0.05}`
