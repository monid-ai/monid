# connector-testing (delta)

## MODIFIED Requirements

### Requirement: Fixtures may carry allowlisted response headers
A recorded call's `res` MAY carry a `headers` map so a header-bearing exchange
(a 302 whose `Location` IS the payload) is replayable. Only headers on the
`RECORDED_RES_HEADERS` allowlist SHALL be captured — `location` today — and
growing the list is a deliberate edit in the same PR as the connector needing it.
Request headers SHALL continue to be never recorded: credentials cannot leak into
fixtures.

#### Scenario: Recording a 302
- **WHEN** `deno task record` captures an exchange answering `302` with a
  `Location` header and a `Set-Cookie` header
- **THEN** the written fixture's `res.headers` SHALL contain `location` only,
  and the response relayed to the live run SHALL carry it too (so the recording
  run and its replay observe the same exchange)

#### Scenario: Replaying a 302
- **WHEN** a fixture call carries `res.headers.location`
- **THEN** `replayFetch` SHALL serve a `Response` carrying that header, and the
  fn SHALL receive it at `res.headers.location`

#### Scenario: Existing fixtures are unaffected
- **WHEN** a committed fixture has no `res.headers`
- **THEN** it SHALL parse unchanged and replay SHALL yield `headers: {}`
