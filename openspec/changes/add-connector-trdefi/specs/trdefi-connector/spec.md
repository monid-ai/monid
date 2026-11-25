# trdefi-connector (delta)

## ADDED Requirements

### Requirement: The trdefi provider is keyless and free
The trdefi provider SHALL declare name `trdefi`, `request.baseUrl`
`https://yield.trdefi.com`, an auth injector that passes the request through
untouched, an EMPTY credential shape, timeouts of 15 s request / 20 s run,
and a FREE usage model. It SHALL carry the categories `defi`, `yields` and
`onchain-data`.

#### Scenario: A read needs no secret
- **WHEN** a caller invokes any trdefi endpoint
- **THEN** no credential is required, none is injected, and the call is free

#### Scenario: The paid write path stays out of the connector
- **WHEN** the connector is listed
- **THEN** only the six GET endpoints appear; the per-request-paid prepare
  endpoints are not exposed

### Requirement: The catalogue endpoints describe the live catalogue
The `stats`, `chains`, `strategies`, `strategy-detail` and `badge` endpoints
SHALL read the live catalogue over GET with query parameters only, and SHALL
state in their descriptions what each one returns. The `chains` endpoint
SHALL report the network set that is live at call time rather than a fixed
count.

#### Scenario: A caller lists what is open
- **WHEN** a caller asks for open positions with a network filter
- **THEN** the response carries the live positions for that network, each with
  its maker quote and depth

#### Scenario: A position is looked up by hash
- **WHEN** a caller asks for one position by its 32-byte hash
- **THEN** the response carries that position, or states that no such position
  is open

### Requirement: A gated position is a coverage limit, not an error
The `quote` endpoint SHALL simulate the fill on-chain for the given amount
and SHALL return the output amount, the effective rate and the fee schedule
that produced it. A position whose maker gates access on the caller SHALL
answer `422` with the gate reason, and the endpoint description SHALL say
that `quote_ready` is a filter and not a guarantee of a price.

#### Scenario: The caller is priced against its own address
- **WHEN** the caller passes its own address as `from`
- **THEN** the simulation is evaluated against that caller and a gated
  position answers with the gate reason instead of a price

#### Scenario: The strategy cannot be simulated
- **WHEN** the position carries no order data for the simulation
- **THEN** the response carries the revert reason rather than a price
