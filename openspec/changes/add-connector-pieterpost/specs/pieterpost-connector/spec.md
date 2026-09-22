# pieterpost-connector (delta)

## ADDED Requirements

### Requirement: PieterPost provider is a credential-isolated pre-send surface

The provider SHALL be named `pieterpost`, use bearer authentication against
`https://pieterpost.com`, declare FREE Monid usage, and use the `postal-mail`
category. Its metadata SHALL state that the connector exposes review and hosted
payment workflows only and that a connector run does not send mail or spend
PieterPost wallet credits.

#### Scenario: Credential stays at the transport boundary

- **WHEN** either PieterPost endpoint runs
- **THEN** the bearer API key is injected by the transport and is absent from
  connector input and output

### Requirement: Create a review link with deterministic retry behavior

`pieterpost#create-compose-link` SHALL accept a required `idempotencyKey`, a
structured recipient, and optional message, locale, external id, and metadata.
It SHALL move `idempotencyKey` into the `Idempotency-Key` request header and
omit it from the JSON body before calling `POST /v1/compose-links`.

#### Scenario: A retry converges on the same draft

- **WHEN** a caller repeats the same input with the same `idempotencyKey`
- **THEN** PieterPost receives the same header key and can return the original
  compose-link resource rather than creating a duplicate

#### Scenario: Review link is not a send

- **WHEN** the endpoint succeeds
- **THEN** it returns a short-lived PieterPost composer URL with FREE usage
- **AND** the call does not charge or send mail

### Requirement: Create an unpaid hosted checkout for text mail

`pieterpost#create-checkout-link` SHALL accept exactly one discriminated letter
or postcard payload, a required stable `idempotencyKey`, sender email, return
URL, and optional payment/address/correlation fields. It SHALL move the
idempotency key to the request header and call `POST /v1/checkout-links`.

#### Scenario: Letter checkout

- **WHEN** the caller supplies `requestType: "letter"` and 1-25 text letters
- **THEN** the endpoint returns PieterPost's order and hosted checkout URL with
  FREE Monid usage
- **AND** `paidAt` and `fulfilledAt` remain null until external payment and
  fulfillment occur

#### Scenario: Mixed payload is rejected before the wire

- **WHEN** a letter request also carries a postcard
- **THEN** input validation fails before any provider request

#### Scenario: Address warning is provider-error data

- **WHEN** PieterPost returns HTTP 409 with address warnings
- **THEN** the run is a zero-billed provider error and preserves the warning
  payload for caller review
