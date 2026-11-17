# truelist-connector (delta)

## ADDED Requirements

### Requirement: Truelist provider definition
The truelist provider SHALL declare name `truelist`, `request.baseUrl`
`https://api.truelist.io`, auth `presets.auth.bearer()`, timeouts 60 s /
60 s, one credit pool `default` ("Truelist credits"), and NO
`usage.consolidate`.

### Requirement: Inline verification endpoint
The connector SHALL provide `POST /api/v1/verify_inline`
(`truelist#api/v1/verify_inline`, `people-enrichment`) with strict query
params: `email` required (an email address). The usage model SHALL be
PER_UNIT `RESULT`, 1 credit, counting 0 when `emails[0].email_state` is
`unknown` or `accept_all`, or `email_sub_state` is `accept_all`.

#### Scenario: A verified address consumes one credit
- **WHEN** the call returns 200 with `email_state` `ok`, `risky`
  (not accept_all) or `email_invalid`
- **THEN** usage is `{credits: {default: 1}, evidence: {RESULT: 1}}`

#### Scenario: Catch-all and unknown are free
- **WHEN** the call returns 200 with `risky` / `accept_all`, or
  `unknown` / `timed_out`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: Errors are data, zero usage
- **WHEN** the key is invalid (401) or the rate limit is hit (429)
- **THEN** `isProviderError` is true, usage `{credits: {}, evidence: {}}`,
  and the vendor `{error}` body rides through
