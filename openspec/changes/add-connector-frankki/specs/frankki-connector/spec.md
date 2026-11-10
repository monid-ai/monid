# frankki-connector (delta)

## ADDED Requirements

### Requirement: FrankKi provider definition
The frankki provider SHALL declare name `frankki`, `request.baseUrl`
`https://backend.frankki.app/api/v1/public/monid/letter`, auth
`presets.auth.header("X-FrankKi-Lane-Key")`, a provider-level FREE usage
model with no `usage.consolidate`, a provider-level `fromResponse` that
returns the envelope's `data` on `status: "success"` and the whole body
otherwise, and a provider-level `fromError` returning `{message, code, raw}`.

#### Scenario: A quote is free and unwrapped
- **WHEN** `POST /quote` returns 200 with `{status: "success", data}`
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** the output is exactly `data`

#### Scenario: A review hold keeps its code
- **WHEN** `POST /checkout` returns 202 with `code: "CONTENT_REVIEW_PENDING"`
- **THEN** the run is not a provider error, usage is empty, and the output
  carries `code`

#### Scenario: A wrong key is data, zero usage
- **WHEN** any endpoint is called with a wrong `X-FrankKi-Lane-Key`
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, output `code` `UNAUTHORIZED`

### Requirement: Six letter endpoints
The connector SHALL provide `frankki#quote`, `frankki#address-check`,
`frankki#compose`, `frankki#preview`, `frankki#checkout` and
`frankki#track`, all POST with a JSON body, all in category `postal-mail`.
Compose SHALL NOT accept `attachmentIds`.

#### Scenario: Quote bounds
- **WHEN** `pageCount` is 0 or 96, or `country` is not two letters
- **THEN** the run fails INVALID_INPUT
- **AND** `pageCount` 95 with country `DE` passes

#### Scenario: Tokens are bounded
- **WHEN** a `draftToken` or `trackingToken` is shorter than 20 or longer
  than 200 characters
- **THEN** the run fails INVALID_INPUT
