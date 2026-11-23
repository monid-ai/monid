# elfa-connector (delta)

## ADDED Requirements

### Requirement: Elfa provider with the vendor meter relayed from headers
The elfa provider SHALL declare name `elfa`, `request.baseUrl`
`https://api.elfa.ai`, auth `presets.auth.header("x-elfa-api-key")`, timeouts
60 s request / 60 s run, and the credit pool `default` ("Elfa credits"). A
provider-level `lifecycle.start` SHALL relay `x-elfa-credits` into
`state.data.credits` when it is a safe non-negative integer, and SHALL relay
`x-elfa-credits-detail` into `state.data.objects` and `state.data.window` only
when the detail carries a `base` part, with `window` 0 when the detail names
none. A provider-level `usage.consolidate` SHALL
claim `state.data.credits`, omitting the entry when it is absent.

#### Scenario: The meter wins over the card
- **WHEN** `GET /v3/events` returns three events with `x-elfa-credits: 2` and
  no detail header
- **THEN** usage is `{credits: {default: 2}}` and the derived card of 4 rides
  out as `mismatch.derived`

#### Scenario: Detail makes the fold agree with the meter
- **WHEN** the same call also carries
  `x-elfa-credits-detail: base=1;objects=1;dedup=2`
- **THEN** evidence counts one event and no `mismatch` appears

#### Scenario: A missing, malformed or zero meter settles the card
- **WHEN** `x-elfa-credits` is absent, not a safe integer, or `0`
- **THEN** the derived card settles the run

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint returns a non-2xx, with or without a meter header
- **THEN** usage is `{credits: {}, evidence: {}}` and the output is
  `{message, code?, details?, raw}`

### Requirement: The model states the published rate card
Every endpoint SHALL model Elfa's published price: flat `PER_CALL` lines for
the fixed-price endpoints, a COMPOSITE of a 1-credit `request` line and a
`RESULT` line for the per-object v3 lists, and select-one COMPOSITEs of `PAGE`
lines for the limit-banded v3 endpoints. Estimates SHALL hold the largest
charge the input allows.

#### Scenario: Prediction markets is one flat credit
- **WHEN** `elfa#v3/events/prediction-markets` is called with up to 30 ids
- **THEN** the hold and the card are 1 credit, however many ids are sent

#### Scenario: Verify is one flat credit
- **WHEN** `elfa#v3/verify` is called with a JSON body
- **THEN** the hold and the card are 1 credit, whatever the verdict

#### Scenario: A topic search still bills its objects
- **WHEN** `elfa#v3/events/storylines` is estimated with `q` and the default
  limit
- **THEN** the hold is 1 + 2 × 10 credits

#### Scenario: Long ranges on trending contracts
- **WHEN** `elfa#v3/market/crypto/trending-contracts` runs with
  `to - from` of 86 700 seconds or less
- **THEN** no `long_range` line is counted; above it, or with `to` omitted in
  the estimate, the 5-credit line is counted. Settlement reads `window` from
  the detail header; without it, an omitted `to` counts no surcharge

### Requirement: Inputs follow Elfa's runtime validators
Every `schema/inputs.ts` SHALL be strict, carry no defaults, and match Elfa's
validator field by field (types, enums, bounds, required fields), checked on
the raw value where Elfa trims or normalises first, so a field-level mistake is
refused before it is sent. Cross-field rules SHALL be stated in endpoint notes
or descriptions. Array params SHALL be sent comma-joined.

#### Scenario: Unknown keys never reach the wire
- **WHEN** any endpoint is called with a key outside its mirror
- **THEN** the run fails `INVALID_INPUT` without IO

#### Scenario: Ids are sent as one list
- **WHEN** `elfa#v3/events` is called with 30 `eventIds`
- **THEN** the wire query carries one `eventIds` value, comma-joined
