# growsurf-connector (delta)

## ADDED Requirements

### Requirement: GrowSurf provider definition, FREE with no vendor meter

The growsurf provider SHALL declare name `growsurf`, `request.baseUrl`
`https://api.growsurf.com/v2`, auth `presets.auth.bearer()`, timeouts 30 s
request / 35 s run, and `usage.model` `FREE`. It SHALL NOT declare
`usage.credits`, `usage.consolidate`, a lifecycle, an `input.toRequest`, an
`output.fromResponse` or an `output.fromError`.

FREE is a vendor fact, not a simplification: GrowSurf includes REST API
access in the customer's plan and its plans differ on rate limit rather than
on price. The money that appears in these payloads — a sale's `grossAmount`,
a commission's `amount` — is the CUSTOMER'S own bookkeeping and is never a
charge for the call.

#### Scenario: Every endpoint settles at zero

- **WHEN** any growsurf endpoint completes with HTTP 200
- **THEN** usage is `{credits: {}, evidence: {}}`, the doc carries no
  `usage.consolidate`, and both quantities slots reference the single
  compiler-synthesized `core#usage.synthesizedEmpty` entry

#### Scenario: Recording a sale is still free

- **WHEN** `growsurf#campaign/{id}/participant/{participantIdOrEmail}/transaction`
  records a $99.00 sale that generates an affiliate commission
- **THEN** the run settles at `{credits: {}, evidence: {}}` — the
  commission is a liability between the customer and their affiliate, and
  the connector prices none of it

#### Scenario: Vendor non-2xx is zero-billed data

- **WHEN** any endpoint receives a 403
  `{name, code, message, status, supportUrl}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the body passes through untouched, `code` included

### Requirement: Identities are the vendor's own paths

Every endpoint's identity SHALL be its wire path, `{id}` and
`{participantIdOrEmail}` placeholders included, and no endpoint SHALL
declare an explicit `endpoint`. Folder names are organisational only.

#### Scenario: Enrolling and reading do not collide

- **WHEN** the compiled bundle is inspected
- **THEN** it carries `growsurf#campaign/{id}/participant` (the POST that
  enrolls) and `growsurf#campaign/{id}/participant/{participantIdOrEmail}`
  (the GET that reads) as two distinct ids, because the vendor's own two
  paths already differ

#### Scenario: Nine published ids

- **WHEN** `deno task ids:check` runs
- **THEN** the nine `growsurf#` ids in `connectors/ids.lock.json` match the
  compiled bundle exactly

### Requirement: Inputs mirror the published OpenAPI without translation

Every `schema/inputs.ts` SHALL mirror its published request schema with
optionality only: no `.default()`, no invented fields, no reshaping. No
endpoint SHALL declare `input.toRequest`. Cross-field rules that cannot
survive `z.toJSONSchema` SHALL be stated on the fields they constrain and,
where a caller could get them silently wrong, in `meta.notes`.

#### Scenario: The analytics window carries no default

- **WHEN** `growsurf#campaign/{id}/analytics` is compiled
- **THEN** its `days` property has no `default`, because GrowSurf accepts
  EITHER `days` OR the `startDate`/`endDate` pair and a materialized 365
  would turn an explicit date pair into a 400

#### Scenario: Documented bounds hold, and are not wider than the vendor's

- **WHEN** `limit: 101`, `days: 1826`, `delayInDays: 91`, a non-integer
  `grossAmount`, a seven-letter `currency`, or a malformed participant
  `email` is sent
- **THEN** the run fails `INVALID_INPUT` before the wire, while the
  boundary twin (`limit: 100`, `days: 1825`, `delayInDays: 90`,
  `grossAmount: 1`, `currency: "USD"`, a well-formed address) is accepted

#### Scenario: An email address in the path is encoded for the caller

- **WHEN** `participantIdOrEmail` is given as the plain address
  `monica@raviga.com`
- **THEN** the issued url carries `monica%40raviga.com`

### Requirement: HTTP 200 does not mean the write took effect

Two endpoints answer a no-op with HTTP 200 and report the outcome in the
body instead. Both SHALL carry the caveat in `meta.notes` and SHALL pass the
vendor's body through unprojected, so the caller can read it.

#### Scenario: A referral credited twice

- **WHEN** `…/{participantIdOrEmail}/ref` is called for a referral that was
  already credited
- **THEN** the run completes with `httpStatus` 200, `isProviderError` false,
  and an output of `{success: false, message}` — a caller branching on the
  status code would double-count

#### Scenario: A sale sent twice under one identifier

- **WHEN** `…/{participantIdOrEmail}/transaction` is resent with the same
  `invoiceId`
- **THEN** the run completes with `httpStatus` 200 and an output of
  `{success: false, duplicate: true, commissionsCreated: 0,
  duplicateFields, matchingCommissionIds, message}` — no second commission
  exists, which is why at least one transaction identifier is required

### Requirement: The connector exposes no irreversible operation

The connector SHALL expose only reads and the three writes that GrowSurf
itself makes safe to repeat: enrollment (idempotent on email address), the
referral credit, and the recorded sale (both de-duplicated by the vendor).
Participant deletion, bulk deletion, API-key rotation, reward fulfillment
and commission approval or deletion SHALL NOT be ported.

#### Scenario: Enrolling the same address twice

- **WHEN** `growsurf#campaign/{id}/participant` is posted with an email
  address that is already enrolled
- **THEN** GrowSurf returns the existing participant unchanged, with its
  existing `shareUrl`, rather than creating a second record

### Requirement: The catalog gains a `referrals` leaf

`connectors/categories.ts` SHALL gain one leaf, `referrals`
("Referrals & Affiliates"), and all nine endpoints SHALL declare it.

#### Scenario: The leaf is the only taxonomy change

- **WHEN** the bundle compiles
- **THEN** `referrals` is the single added leaf and no existing leaf id,
  display name or description changes
