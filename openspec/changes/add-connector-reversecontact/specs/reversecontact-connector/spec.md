# reversecontact-connector (delta)

## ADDED Requirements

### Requirement: Reverse Contact provider definition
The reversecontact provider SHALL declare name `reversecontact`,
`request.baseUrl` `https://api.reversecontact.com`, auth
`presets.auth.bearer()`, and the single credit pool `default` ("Reverse
Contact credits"). It SHALL declare a provider-level `output.fromError` and
SHALL NOT declare a lifecycle, because a provider-level `start` would
replace the declarative execution of the thirteen synchronous endpoints.

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
same figure when it is positive. On a billed endpoint the evidence SHALL
read the receipt with `utils.json.num`, so a billed success without one
fails `FN_CONTRACT`. Free endpoints (the two counts and the two
availability checks) SHALL declare a `FREE` model, and their evidence
counts nothing without reading the receipt.

#### Scenario: A prompt search bills its base credit
- **WHEN** a People Search by prompt returns two profiles with a receipt
  of 3
- **THEN** usage is `{credits: {default: 3}, evidence: {CREDIT: 3}}`

#### Scenario: An empty page settles zero
- **WHEN** a search returns `data.data: []` with a receipt of 0
- **THEN** usage carries no credits and `evidence` is `{CREDIT: 0}`

#### Scenario: A 2xx without its receipt fails closed
- **WHEN** a billed synchronous endpoint answers 2xx with data and no
  `quotas.creditsConsumed`
- **THEN** the run fails `FN_CONTRACT` and settles nothing at zero

### Requirement: The availability checks are free
`reversecontact#v2/fetch/persons/check` and
`reversecontact#v2/fetch/companies/check` SHALL declare a `FREE` model and
take the fetches' body.

#### Scenario: A profile the database does not hold
- **WHEN** a check answers 200 `{exists: false, lastUpdate: null}`
- **THEN** the run succeeds with usage `{credits: {}, evidence: {}}` and
  no `quotas` in the output

### Requirement: The account's quotas never reach the caller
`usage.consolidate` SHALL pluck the whole `quotas` block out of every
success output, and `output.fromError` SHALL remove it from `raw`.

#### Scenario: Success and error alike
- **WHEN** any endpoint settles, successfully or as a provider error
- **THEN** no `quotas` key is present in the output or in `output.raw`

### Requirement: The finders run to a finished job
`reversecontact#v2/contact/email` and `reversecontact#v2/contact/phone`
SHALL each carry a lifecycle whose `start` submits the body and keeps
`data.webhookId` as `externalRunId`, and whose `poll` long-polls
`GET /v2/webhooks/{webhookId}?wait=20` until `data.status` is `succeeded`
or `errored`. A read that fails SHALL hold the run open and read again
after 5 s: a transport failure, 401, 403, 408, 429 or any 5xx. Any other
non-2xx poll (404, 410: the job cannot be read) SHALL fail the run as a 502
carrying the poll's status as `providerHttpStatus`, never as a 404. The
submit SHALL carry `Idempotency-Key: {runId}:submit`, the same on every
start of one run, so a resend is the same request upstream. A submit lost
in transit SHALL fail the start as a retriable `EXECUTION_FAILED`, and so
SHALL a 409 `IDEMPOTENCY_KEY_IN_USE`. A 2xx acknowledgement without a
`webhookId` SHALL be a non-retriable infrastructure failure. Both finders
SHALL carry a 30-minute `runMs`. The two lifecycles SHALL be byte-identical.

#### Scenario: The job's receipt is the bill
- **WHEN** an email job succeeds and its final poll reports
  `data.creditsConsumed: 3` with `quotas.creditsConsumed: 0`
- **THEN** usage is `{credits: {default: 3}, evidence: {CREDIT: 3}}` and
  neither `quotas` nor `data.creditsConsumed` is present in the output

#### Scenario: An `any` lookup bills the kinds it found
- **WHEN** an email job with `emailType: any` debits 5 upfront, finds a
  professional and a personal address, and its final poll reports
  `data.creditsConsumed: 8`
- **THEN** usage is `{credits: {default: 8}, evidence: {CREDIT: 8}}`; the
  same lookup finding only a professional address reports 3 and settles 3

#### Scenario: A finished job without its receipt fails closed
- **WHEN** an email job succeeds and its final poll carries no
  `data.creditsConsumed`
- **THEN** the run fails `FN_CONTRACT` and settles nothing at zero

#### Scenario: A failed read holds the run open
- **WHEN** a poll answers 401, then 403, or is lost in transit, while the
  job runs upstream
- **THEN** the run reads again 5 s later and settles on the finished job

#### Scenario: A job that cannot be read is a failure, not a miss
- **WHEN** a poll answers 404 `WEBHOOK_EVENT_NOT_FOUND` or 410
  `WEBHOOK_EVENT_EXPIRED`
- **THEN** the run settles 502 with `providerHttpStatus` 404 or 410, zero
  usage, and the upstream `code`

#### Scenario: A resent submit converges on the first job
- **WHEN** the submit's response is lost in transit and the host resends
  the start under the same run
- **THEN** the first start fails retriable `EXECUTION_FAILED`, both
  submits carry `Idempotency-Key: {runId}:submit`, and the resend's
  replayed acknowledgement parks the run on the first job's `webhookId`

#### Scenario: A resend while the first submit is still processed
- **WHEN** the resend answers 409 `IDEMPOTENCY_KEY_IN_USE`
- **THEN** the start fails retriable `EXECUTION_FAILED`, never a settled
  run

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
or `id` on the fetches and the availability checks; `email`, `firstName` or `lastName` on the person
enrichment; exactly one of `url` or `id` on the lookalike; `url`,
`fullName` + `companyDomain`, or `firstName` + `lastName` + `companyDomain`
on the finders. `emailType` SHALL be accepted on the email finder only.
The People filters SHALL carry the contract-type filters as the vendor's
closed list of eight values and SHALL NOT carry `email`. `perPage` SHALL
default to the vendor's 25 at the binding. No mirror SHALL expose `issuer`,
`webhookUrl` or `fullProfile`.

#### Scenario: A withheld field is rejected at the gate
- **WHEN** a finder body carries `webhookUrl`, or a search body `issuer`
- **THEN** the run fails `INVALID_INPUT` and no request reaches Reverse
  Contact
