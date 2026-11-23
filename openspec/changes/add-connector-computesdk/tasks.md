# Tasks: add-connector-computesdk

## 1. Provider + resource

- [x] 1.1 provider.ts: bearer auth, baseUrl, `virtual-machines`, no credits
- [x] 1.2 categories.ts: `virtual-machines` leaf
- [x] 1.3 resources/sandbox: data schema, verify / release / refresh,
      DAY rate card with ESTIMATED per-second `compute`, hourly reconcile

## 2. Endpoints (14, all FREE)

- [x] 2.1 get-options, get-quote
- [x] 2.2 create-sandbox (provisions), get-sandbox (reads),
      list-sandboxes (reads, ownership window only), destroy-sandbox
      (releases)
- [x] 2.3 run-command (static `Accept: application/json`), read-file,
      write-file, delete-path, start-process, get-process, kill-process,
      get-sandbox-url (uses, keyed `$.body.sandboxId`)

## 3. Fixtures + tests

- [x] 3.1 `deno task record`: options, quote, create (2026-11-13)
- [x] 3.2 Synthetic resource-bound chains from live REST bodies
- [x] 3.3 Connector tests: free usage, provision / release, foreign 404,
      list from the ownership window, buffered command
- [x] 3.4 Resource tests: verify, refresh on 404, reconcile window math,
      a running sandbox, a 404 read that throws, an empty `destroyedAt`
      that throws
- [x] 3.6 Per-endpoint suites: whole `{credits, evidence}` usage on the
      happy path, a provider-error fixture per upstream endpoint, a schema
      gate with a near-twin per endpoint that takes input, and live tests
      gated on `liveSkip("computesdk")` (one sandbox, always destroyed)
- [ ] 3.5 Record resource-bound fixtures once the recorder can seed an
      owned resource

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / spec / tasks
- [x] 4.2 Verify: check · test
