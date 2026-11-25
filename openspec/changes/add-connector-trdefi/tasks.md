# Tasks: add-connector-trdefi

## 1. Vendor surface

- [x] 1.1 Read the published API docs and the live OpenAPI document: base
      url, the read paths, the `{ data, meta }` envelope, the error bodies
- [x] 1.2 Confirm the read surface needs no credential, and that the write
      path is paid per request rather than key-bound

## 2. Provider

- [x] 2.1 `provider.ts`: keyless injector, empty credential shape, base url,
      timeouts, free usage model, the three categories
- [x] 2.2 The description states the real coverage limits rather than the
      promise, and the network count is read from the live catalogue

## 3. Endpoints (6)

- [x] 3.1 `stats`: catalogue totals, per-chain breakdown, deepest pairs
- [x] 3.2 `chains`: the live networks with their engine addresses and tokens
- [x] 3.3 `strategies`: open positions, filterable by network and pair
- [x] 3.4 `strategy-detail`: one position by its hash
- [x] 3.5 `quote`: an on-chain simulated fill for one position, carrying the
      gate reason when the position is gated
- [x] 3.6 `badge`: a shields.io payload with live metrics
- [x] 3.7 Add the six ids to `connectors/ids.lock.json`

## 4. Tests

- [x] 4.1 One replay test per endpoint against a recorded fixture, with
      URL-exact assertions
- [x] 4.2 A synthetic provider-error chain per endpoint
