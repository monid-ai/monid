# zenrows-connector (delta)

## ADDED Requirements

### Requirement: Zenrows provider definition with the header meter
The zenrows provider SHALL declare name `zenrows`, `request.baseUrl`
`https://api.zenrows.com/v1`, auth `presets.auth.header("X-API-Key")`,
timeouts 180 s request / 190 s run (Zenrows documents a 3-minute ceiling
per request), credit pool `default` ("Zenrows credits"), a `PER_UNIT`
model on `CREDIT` consuming 1 credit per credit, a sync `lifecycle.start`
that relays the response and puts a valid `X-Request-Credits` header into
`state.data.creditsCharged`, a `usage.consolidate` that claims that value,
and an `output.fromError` that digests RFC 7807 `problem+json` into
`{message, code?, raw}`.

#### Scenario: The claim settles the bill
- **WHEN** `zenrows#scrape` returns 200 with `X-Request-Credits: 5`
- **THEN** usage is `{credits: {default: 5}, evidence: {CREDIT: 5}}` with
  no `mismatch`

#### Scenario: A readable meter is never a mismatch
- **WHEN** the header is any of 1, 5, 10, 25 or 137
- **THEN** the claim and the derived fold are equal at every value, because
  the rate is an identity

#### Scenario: No usable header settles at the ceiling
- **WHEN** the header is absent, empty, blank, negative, not a plain
  integer, or above `Number.MAX_SAFE_INTEGER`
- **THEN** the claim is omitted, evidence reports 25 `CREDIT`, and the run
  settles on that derived fold rather than at zero

#### Scenario: An explicit zero is a free run
- **WHEN** the header is `0`
- **THEN** usage is `{credits: {}, evidence: {CREDIT: 0}}`, which is
  distinct from the header being absent

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** `zenrows#scrape` receives a 401 AUTH002
- **THEN** `isProviderError` is true, `credits` is `{}`, and the output is
  `{message, code, raw}` with `message` taken from `detail`

### Requirement: The hold is the caller's own configuration
`usage.estimate` SHALL read `js_render`, `premium_proxy` and `mode` off the
validated input and hold what the published table prices that
configuration at. The fn SHALL live on the provider, so both endpoints
intern one entry.

#### Scenario: Each configuration holds what it draws
- **WHEN** `zenrows#scrape` or `zenrows#extract` is estimated
- **THEN** the estimate is `{default: 1}` for a plain request,
  `{default: 5}` with `js_render`, `{default: 10}` with `premium_proxy`,
  and `{default: 25}` with both
- **AND** it is `{default: 25}` whenever `mode=auto` is set, the ceiling
  Adaptive Stealth Mode can escalate to
- **AND** the same configuration estimates alike on either endpoint

### Requirement: Two endpoints on one wire path, each with its own id
Both endpoints SHALL bind `GET /` and SHALL pin `endpoint:` explicitly
(`/scrape`, `/extract`), because the shared wire path would derive the same
empty id for the pair.

#### Scenario: Both endpoints exist and share the provider's fns
- **THEN** exactly two `zenrows#` docs exist, `zenrows#extract` and
  `zenrows#scrape`
- **AND** their `lifecycle.start`, `usage.consolidate`, `usage.evidence`
  and `usage.estimate` fn keys are pairwise equal, each interned to one
  fnTable entry
- **AND** neither declares `lifecycle.poll`

### Requirement: Scrape returns the page, in the shape asked for
`zenrows#scrape` SHALL default `response_type` to `markdown` and SHALL
offer `html` as its own value, which sends NO `response_type` to the API.
It SHALL declare no `output` hook and no `output.schema`.

#### Scenario: Markdown by default
- **WHEN** `zenrows#scrape` is called with only a `url`
- **THEN** the issued query string carries `response_type=markdown` and the
  body rides out as the vendor sent it

#### Scenario: html sends no response_type at all
- **WHEN** `zenrows#scrape` is called with `response_type: "html"`
- **THEN** the issued query string carries `url` and no `response_type`

### Requirement: Extract returns the fields, not the page
`zenrows#extract` SHALL merge `extract=auto` at its binding and SHALL
declare an `output.fromResponse` that returns `$.parsed`. A body with no
`parsed` SHALL pass through whole.

#### Scenario: The parsed fields without the page
- **WHEN** `zenrows#extract` returns 200 with `{html, parsed}`
- **THEN** the output is `parsed` alone, with no `html` key

#### Scenario: A shape change is visible, not silent
- **WHEN** the response body carries no `parsed`
- **THEN** the body passes through whole rather than emptying the output

#### Scenario: An unprepared domain is refused and unbilled
- **WHEN** `zenrows#extract` is called for a domain Extract does not serve
- **THEN** the answer is 403 REQS007, `credits` is `{}`, and the raw
  envelope carries `reason: domain_not_prepared`, so a caller can tell the
  refusal cases apart without comparing English

### Requirement: The input gate mirrors the vendor, strictly
Each `schema/` SHALL mirror the Zenrows Fetch parameters with optionality
only, as a strict object. The `url` field SHALL pin the scheme with a
pattern that survives `z.toJSONSchema`, not with a refinement. Cross-field
rules the API enforces SHALL be stated in the `.describe()` of the field
they constrain, because refinements do not reach the compiled doc.

#### Scenario: Only http and https reach the wire
- **WHEN** `zenrows#scrape` is called with an `ftp:`, `file:` or
  `javascript:` URL
- **THEN** it fails INVALID_INPUT before any request leaves

#### Scenario: The vendor's own parameters, and nothing else
- **WHEN** a request carries an unknown key, a `mode` other than `auto`, a
  string `session_id`, a string `js_render`, or `response_type: "pdf"`
- **THEN** each fails INVALID_INPUT before any wire call

#### Scenario: The gate is not too wide
- **WHEN** a request carries only a `url`, or adds `mode=auto`,
  `response_type`, `css_extractor`, `outputs` beside `response_type: html`,
  both manual flags, or a numeric `session_id`
- **THEN** none of them fails INVALID_INPUT
