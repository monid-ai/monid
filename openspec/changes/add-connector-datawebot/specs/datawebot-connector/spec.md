# datawebot-connector (delta)

## ADDED Requirements

### Requirement: Three public identities
The provider SHALL be `datawebot`, use bearer authentication against
`https://api.datawebot.com` and declare one `default` credit pool in datawebot
credits. It SHALL expose `datawebot#search` and `datawebot#product`, which POST
to `/v1/requests`, and `datawebot#sites`, which GETs `/v1/sites`.

#### Scenario: Capability is fixed by the identity
- **WHEN** `datawebot#search` or `datawebot#product` executes
- **THEN** the wire body carries `capability` `search` or `product`
  respectively, and `capability` is absent from the caller-facing schema

### Requirement: Inputs mirror the vendor's closed schema
`datawebot#search` SHALL require `query` and `site`. Unknown keys SHALL be
rejected on all three endpoints. `datawebot#product` SHALL accept `url` or
`product_id`; that exactly one is needed is a cross-field rule stated in
`notes`.

#### Scenario: Search without a shop fails before the wire
- **WHEN** a search body omits `site`
- **THEN** validation SHALL fail with INVALID_INPUT and no call is made

### Requirement: Slow requests finish through the free status route
`datawebot#search` and `datawebot#product` SHALL return RUNNING when the
router answers `status: "working"`, and poll `GET /v1/requests/{id}` until the
status is `done` or `failed`. A 429 or 5xx from the status route SHALL keep
the run RUNNING; `runMs` bounds the wait.

#### Scenario: Working, then done
- **WHEN** the submit answers working with a request_id and the next poll
  answers done using 5 credits
- **THEN** the run SHALL settle 200 with usage `{credits: {default: 5}}`

### Requirement: Billing equals the vendor's meter
Billed endpoints SHALL be leaf PER_UNIT in CREDIT units with
`meta.credits_used` as evidence and claim. `datawebot#sites` SHALL be FREE.

#### Scenario: Failed before a page loaded
- **WHEN** the answer is `status: "failed"` with `meta.credits_used` 0
- **THEN** the run SHALL settle as a 502 provider error with zero usage

#### Scenario: Page loaded, nothing found
- **WHEN** the answer is `status: "failed"` with `meta.credits_used` 25
- **THEN** the run SHALL settle 200 with usage `{credits: {default: 25}}`

### Requirement: The key holder's balance never reaches a caller
`meta.credits_left` SHALL be removed from every success output and from the
raw body of every error.

#### Scenario: Inline answer
- **WHEN** a search answers done
- **THEN** the output `meta` SHALL contain `as_of` and neither `credits_left`
  nor `credits_used`
