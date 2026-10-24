# prova-connector (delta)

## ADDED Requirements

### Requirement: Prova provider definition
The prova provider SHALL declare name `prova`, `request.baseUrl`
`https://api.provaapi.com/api/v1`, auth `presets.auth.bearer()`, and the
single credit pool `default` ("US dollars"). It SHALL NOT declare a
lifecycle or a `usage.consolidate`, because no Prova response carries a
meter.

### Requirement: Only a found answer is billed
`prova#funding-stages` SHALL price a leaf `PER_UNIT` in `RESULT` units at
0.01 dollars, estimate one `RESULT`, and count one `RESULT` exactly when the
output's `status` is `found`.

#### Scenario: A found answer costs one cent
- **WHEN** Prova answers 200 `{status: "found", ...}`
- **THEN** usage is `{credits: {default: 0.01}, evidence: {RESULT: 1}}`

#### Scenario: No funding found is free
- **WHEN** Prova answers 200 `{status: "not_found", message}`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** Prova answers 422 `{error}` to a body with no identifier
- **THEN** `isProviderError` is true and usage is
  `{credits: {}, evidence: {}}`

### Requirement: A pending answer is polled, not returned
`prova#funding-stages` SHALL own `lifecycle.start` and `lifecycle.poll`. A
202 SHALL keep the run `RUNNING`, and each poll SHALL re-post the same
request; a 5xx during a poll SHALL keep the run `RUNNING`; any other status
SHALL complete the run with that status and body. `runMs` bounds the wait.

#### Scenario: Pending, then found on the re-post
- **WHEN** the first POST answers 202 `{status: "pending"}` and the re-post
  answers 200 `{status: "found", ...}`
- **THEN** the run completes 200 with the found answer and usage
  `{credits: {default: 0.01}, evidence: {RESULT: 1}}`
