# dealport-connector (delta)

## ADDED Requirements

### Requirement: Dealport provider definition with US dollar billing consolidation
The Dealport provider SHALL declare name `dealport`, `request.baseUrl`
`https://app.dealport.com`, auth `presets.auth.bearer()`, timeouts 60 s request
/ 65 s run (overridden to 150 s / 160 s on owner and contact resolution),
`usage.credits.default` labeled `US dollars`, and a provider-wide
`usage.consolidate` that claims the vendor's reported US dollar charge (`cost_usd`,
falling back to `credits_charged / 100` on cent-metered search responses) while
stripping Dealport's billing receipt fields from the returned payload.

#### Scenario: Vendor receipt settles and leaves the payload
- **WHEN** `dealport#api/v1/records/{id}` returns 200 with `cost_usd: 0.01` and
  `remaining_balance_usd: 4.99`
- **THEN** usage settles to `{credits: {default: 0.01}, evidence: {RESULT: 1}}`
  with no `mismatch`, and `cost_usd`, `credits_charged`, and
  `remaining_balance_usd` are absent from `result.output`

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint returns a 401 or 403 error envelope
- **THEN** `isProviderError` is true and usage is `{credits: {}, evidence: {}}`

### Requirement: Published V4 plain-USD rate card and zero-charge misses
Each endpoint SHALL declare Dealport's published V4 rate card from
`https://app.dealport.com/openapi/v1.json`:
- `dealport#api/v1/companies/preview`: `FREE` ($0.00)
- `dealport#api/v1/companies/match`: `FREE` ($0.00)
- `dealport#api/v1/companies`: `PER_UNIT` (`Unit.RESULT`, $0.01)
- `dealport#api/v1/buildings`: `PER_UNIT` (`Unit.RESULT`, $0.01)
- `dealport#api/v1/records/{id}`: `PER_UNIT` (`Unit.RESULT`, $0.01)
- `dealport#api/v1/pages`: `PER_UNIT` (`Unit.RESULT`, $0.01)
- `dealport#api/v1/owners`: `PER_UNIT` (`Unit.RESULT`, $0.09)
- `dealport#api/v1/contacts`: `PER_UNIT` (`Unit.RESULT`, $0.09)
- `dealport#api/v1/buildings/owners`: `PER_UNIT` (`Unit.RESULT`, $0.05)

Empty searches, owner misses, cached website fetches, unconfirmed building-owner
quotes, and 30-day workspace repeat reads SHALL count `0` units and settle at
`{credits: {}, evidence: {RESULT: 0}}`.

#### Scenario: Owner miss bills zero
- **WHEN** `dealport#api/v1/owners` or `dealport#api/v1/contacts` returns 200
  with `phone: null`, `email: null`, and `cost_usd: 0`
- **THEN** usage settles to `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: Cached website Markdown bills zero, live fetch bills $0.01
- **WHEN** `dealport#api/v1/pages` returns `live_fetched_count: 1`,
  `cached_count: 1`, and `cost_usd: 0.01`
- **THEN** usage settles to `{credits: {default: 0.01}, evidence: {RESULT: 1}}`

#### Scenario: Building owner quote bills zero before confirmation
- **WHEN** `dealport#api/v1/buildings/owners` runs without `confirm_max_usd`
- **THEN** pre-run estimate and settled usage are both
  `{credits: {}, evidence: {RESULT: 0}}`

### Requirement: Strict OpenAPI input mirrors and shared fn interning
Every `schema/inputs.ts` SHALL mirror its OpenAPI 3.1 input with optionality
only as a strict object, with defaults and cross-field `anyOf` unions applied at
the endpoint binding. Identical `estimate` and `evidence` hooks across the two
search endpoints and across the two owner/contact endpoints SHALL intern to
shared `fnTable` entries.

#### Scenario: Invalid inputs fail before any network call
- **WHEN** an endpoint is called with an unknown property, a malformed UUID or
  NYC BBL, or without a required identifier
- **THEN** execution rejects with `INVALID_INPUT` and zero upstream HTTP calls
