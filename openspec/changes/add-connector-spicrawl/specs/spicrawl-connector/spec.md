# spicrawl-connector (delta)

## ADDED Requirements

### Requirement: Spicrawl provider definition with the vendor meter
The spicrawl provider SHALL declare name `spicrawl`, `request.baseUrl`
`https://api.spicrawl.com/v1`, auth `presets.auth.bearer()`, credit pool
`default` ("Spicrawl credits"), a provider-level `usage.consolidate` that
plucks `$.credits` or else `$.credits_used` out of the output as the claim, and
a provider-level `output.fromError` that normalizes the RFC 7807 problem body
into `{message, code?, raw}`.

#### Scenario: Claim wins and leaves the payload
- **WHEN** `POST /scrape` returns `credits: 1`
- **THEN** usage is `{credits: {default: 1}, evidence: {CREDIT: 1}}` and
  `credits` is absent from the output

#### Scenario: Job search meter
- **WHEN** `POST /jobs/search` returns `credits_used: 2`
- **THEN** usage is `{credits: {default: 2}, evidence: {CREDIT: 2}}` and
  `credits_used` is absent from the output

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 401 problem+json
- **THEN** `isProviderError` is true and usage is `{credits: {}, evidence: {}}`

### Requirement: Scrape estimate is deduced from the request
`spicrawl#scrape` SHALL estimate 1 credit for a plain fetch, 3 with
`js_render`, 8 with `mode: "auto"` or `solve_captcha`, plus 5 with
`solve_captcha`, capped by a positive `max_cost`, and SHALL send
`response_format: "json"` on every call.

#### Scenario: Rungs and cap
- **WHEN** the estimate runs for `{}`, `{js_render}`, `{mode: "auto"}`,
  `{js_render, solve_captcha}` and `{js_render, max_cost: 2}`
- **THEN** it is 1, 3, 8, 13 and 2 credits

### Requirement: Bodies are strict and omit shared-key state
Every body schema SHALL be `.strict()`. `spicrawl#scrape` SHALL NOT accept
`session_id`, `spicrawl#jobs/search` SHALL NOT accept `find_contacts`, and
`spicrawl#brand` SHALL reject unknown keys.

#### Scenario: Rejected near-valid input
- **WHEN** a valid body also carries `session_id` (scrape), `find_contacts`
  (job search) or an unknown key (brand)
- **THEN** the run fails with `INVALID_INPUT`, while the same body without that
  key passes validation

### Requirement: One interned fn per hook across the provider
The three endpoint docs SHALL share the provider's `auth.inject`,
`output.fromError` and `usage.consolidate` fns.

#### Scenario: Provenance
- **WHEN** the compiled bundle is inspected
- **THEN** the three docs carry identical fn keys for those three hooks
