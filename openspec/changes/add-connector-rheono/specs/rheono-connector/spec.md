# rheono-connector (delta)

## ADDED Requirements

### Requirement: Rheono provider definition with keyless auth and a FREE usage model
The rheono provider SHALL declare name `rheono`, `request.baseUrl`
`https://rheono.dev`, timeouts 20 s request / 25 s run, categories
`["security"]`, an `auth.inject` that returns the request parts unchanged
with an all-optional credential object (so the injector requires nothing
and the request egresses bare — the default `{apiKey: required}` shape would
wrongly demand `RHEONO_CREDENTIALS_API_KEY`), and a provider-level
`usage.model` of kind `FREE` with no consolidate fn (design D27: the
quantities fns are compiler-synthesized). The provider SHALL declare notes
for the consent posture (only test domains you own or are authorized to
test), the address refusal (private, loopback and cloud-metadata targets
are refused), and the per-client rate limit.

#### Scenario: No credentials are required to run
- **WHEN** the engine executes `rheono#check` in an environment with no
  `RHEONO_*` variables set
- **THEN** credential resolution yields an empty param record, validation
  against the empty credential shape passes, and the request egresses bare

#### Scenario: FREE settles to zero
- **WHEN** any rheono endpoint completes
- **THEN** usage is `{credits: {}, evidence: {}}` and both quantity slots
  on both docs are the one compiler-synthesized `core#usage.synthesizedEmpty`
  fnTable entry

### Requirement: Check returns the instant posture pass
`rheono#check` SHALL be `POST https://rheono.dev/api/check-app` with body
`{url: string}` (3–300 chars), no output projection — the vendor body is
the contract — and categories `["security"]`.

#### Scenario: Happy check
- **WHEN** the endpoint returns 200 with
  `{ok, url, status, tls, findings, checkedPaths, summary}`
- **THEN** the output equals the vendor body verbatim and usage is
  `{credits: {}, evidence: {}}`

#### Scenario: Vendor 400 is data
- **WHEN** the endpoint returns 400 `{ok: false, error: "invalid url"}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output is the vendor body verbatim

### Requirement: Request-pentest returns the submission receipt
`rheono#request-pentest` SHALL be
`POST https://rheono.dev/api/check-request` with body
`{domain: string, email: string}`, no output projection, and categories
`["security"]`.

#### Scenario: Happy request
- **WHEN** the endpoint returns 200 with
  `{ok: true, domain, email, started}`
- **THEN** the output equals the vendor body verbatim and usage is
  `{credits: {}, evidence: {}}`

#### Scenario: Started-false is still success
- **WHEN** the vendor answers `started: false` (no egress slot free; a
  human starts the probe from the vendor's console)
- **THEN** the run completes as a non-error with the receipt as output
