# Tasks: add-connector-specstream

## 1. Provider + schemas

- [x] 1.1 provider.ts: Bearer auth, baseUrl, 60 s request budget, one
      `default` pool (US dollars), provider-level FREE, vendor error
      envelope mapped by `output.fromError`
- [x] 1.2 schema/inputs.ts per endpoint, mirroring the OpenAPI request
      bodies (defaults and requireds applied at the binding)

## 2. Endpoints (4)

- [x] 2.1 parse: POST /v1/parse
- [x] 2.2 quote: POST /v1/capacity/quotes, `requested_units` defaults to 25
- [x] 2.3 run: POST /v1/capacity/executions with start / poll / stop,
      captured cents metered (D2), estimate is `confirm_max_cents`
- [x] 2.4 find-rows: GET /v1/finds/{id}/rows with `cursor` and `limit`

## 3. Fixtures + tests

- [x] 3.1 Synthetic provider-level chains: parse (runnable, needs_edit),
      quote (ok, refused), find rows, run (ok, empty, transient, rejected,
      stop settled, stop unresolved)
- [x] 3.2 Response bodies validated against the public OpenAPI schemas
- [x] 3.3 Tests per endpoint: happy path with provenance, zero usage on
      the free endpoints, settled run bills captured cents, empty run is
      free, transient lookup keeps the run alive, refused submit is data,
      stop settled and unresolved, estimate equals the approved maximum,
      schema gates with near-twins, live tests gated on
      `SPECSTREAM_API_KEY` (the run also needs `SPECSTREAM_LIVE_SPEND`)
- [ ] 3.4 Replace synthetic fixtures via `deno task record` when a key
      exists

## 4. Wiring + docs

- [x] 4.1 `connectors/ids.lock.json`: the four new ids
- [x] 4.2 OpenSpec proposal / design / spec
- [x] 4.3 Verify: fmt, lint, check, test, double compile, version:check
