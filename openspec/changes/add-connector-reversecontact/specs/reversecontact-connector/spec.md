# reversecontact-connector (delta)

## ADDED Requirements

### Requirement: Reverse Contact provider definition
The reversecontact provider SHALL declare name `reversecontact`,
`request.baseUrl` `https://api.reversecontact.com`, auth
`presets.auth.bearer()`, and the single credit pool `default` ("Reverse
Contact credits"). It SHALL declare a provider-level `output.fromError` and
SHALL NOT declare a lifecycle, because a provider-level `start` would
replace the declarative execution of the eleven synchronous endpoints.

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 402
  `{success: false, error: {code: "INSUFFICIENT_CREDITS", details:
  {required, available}}}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence:
  {}}`, and the output carries `code`, `message` and `details` beside the
  raw envelope

### Requirement: The receipt settles every synchronous run
Every billed synchronous endpoint SHALL price a leaf `PER_UNIT` in `CREDIT`
units at amount 1, and the provider SHALL declare `usage.evidence` reading
`quotas.creditsConsumed` as that count and `usage.consolidate` claiming the
same figure when it is positive. Free endpoints (the two counts) SHALL
declare a `FREE` model.

#### Scenario: A prompt search bills its base credit
- **WHEN** a People Search by prompt returns two profiles with a receipt
  of 3
- **THEN** usage is `{credits: {default: 3}, evidence: {CREDIT: 3}}`

#### Scenario: An empty page settles zero
- **WHEN** a search returns `data.data: []` with a receipt of 0
- **THEN** usage carries no credits and `evidence` is `{CREDIT: 0}`

### Requirement: The account's quotas never reach the caller
`usage.consolidate` SHALL pluck the whole `quotas` block out of every
success output, and `output.fromError` SHALL remove it from `raw`.

#### Scenario: Success and error alike
- **WHEN** any endpoint settles, successfully or as a provider error
- **THEN** no `quotas` key is present in the output or in `output.raw`

### Requirement: The finders run to a finished job
`reversecontact#v2/contact/email` and `reversecontact#v2/contact/phone`
SHALL each carry a lifecycle whose `start` submits the body and keeps
`data.webhookId` as `externalRunId`, and whose `poll` reads
`GET /v2/webhooks/{webhookId}` until `data.status` is `succeeded` or
`errored`. A poll answering 408, 429 or any 5xx SHALL hold the run open. A
2xx acknowledgement without a `webhookId` SHALL be a non-retriable
infrastructure failure. The two lifecycles SHALL be byte-identical.

#### Scenario: The job's receipt is the bill
- **WHEN** an email job succeeds and its final poll reports
  `data.creditsConsumed: 3` with `quotas.creditsConsumed: 0`
- **THEN** usage is `{credits: {default: 3}, evidence: {CREDIT: 3}}` and
  neither `quotas` nor `data.creditsConsumed` is present in the output

#### Scenario: A refunded miss is a 404
- **WHEN** a job ends `errored` with `email-not-found`
- **THEN** the run settles 404, zero usage, with `code` `email-not-found`
  and a message saying nothing was billed

#### Scenario: Phone finding is off
- **WHEN** the phone submit answers 410 `{error: "endpoint_unavailable",
  message, alternative}`
- **THEN** the run settles 410, zero usage, with `code`
  `endpoint_unavailable`

### Requirement: Inputs mirror the gateway's validators
Every mirror SHALL be strict, as the gateway rejects unknown search keys.
URLs SHALL carry the gateway's own patterns and ids their `prs_` / `com_`
patterns. The vendor's one-of rules SHALL be unions of required arms: `url`
or `id` on the fetches; `email`, `firstName` or `lastName` on the person
enrichment; exactly one of `url` or `id` on the lookalike; `url`,
`fullName` + `companyDomain`, or `firstName` + `lastName` + `companyDomain`
on the finders. `perPage` SHALL default to the vendor's 25 at the binding.
No mirror SHALL expose `issuer`, `webhookUrl` or `fullProfile`.

#### Scenario: A withheld field is rejected at the gate
- **WHEN** a finder body carries `webhookUrl`, or a search body `issuer`
- **THEN** the run fails `INVALID_INPUT` and no request reaches Reverse
  Contact
