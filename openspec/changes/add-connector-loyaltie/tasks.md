# Tasks: add-connector-loyaltie

## 1. Provider + schemas

- [x] 1.1 provider.ts: keyless auth, MCP base URL and headers, 30 s
      timeouts, FREE model, JSON-RPC unwrap in `output.fromResponse`
- [x] 1.2 schema/common.ts: shared intent/context, product ref, uuid

## 2. Endpoints (4)

- [x] 2.1 search-catalog, get-product, get-maker, build-cart-link: one
      `tools/call` each, `shopping` category, Monid attribution

## 3. Fixtures + tests

- [x] 3.1 Recorded happy fixtures (2026-11-17) and get-product not-found
- [x] 3.2 Synthetic provider-error fixtures (recorded 400 body, D3)
- [x] 3.3 Per endpoint: happy (outgoing body captured and asserted,
      whole output deep-equal, result count), provider error, schema
      gate with passing near-twin, gated live test (shape only)
- [x] 3.4 provider.test.ts: provenance via testBundle

## 4. Wiring + docs

- [x] 4.1 `shopping` category leaf; ids.lock.json entries
- [x] 4.2 OpenSpec proposal / design / spec
