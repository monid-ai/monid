# Tasks: add-connector-specstream

## 1. Provider + schemas

- [x] 1.1 provider.ts: Bearer auth, baseUrl, 60 s request budget, one
      `default` pool (US dollars), vendor error envelope mapped by
      `output.fromError`
- [x] 1.2 schema/inputs.ts per endpoint, mirroring the OpenAPI request
      bodies for `/v1/web-search` and `/v1/extract`

## 2. Endpoints (2)

- [x] 2.1 web-search: POST /v1/web-search, receipt metering on
      `data.price_usd`, estimate by the published base + per-10 rule
- [x] 2.2 extract: POST /v1/extract, receipt metering on
      `data.price_usd`, estimate per requested URL

## 3. Fixtures + tests

- [x] 3.1 Synthetic provider-level chains: web-search (ok, fast,
      rejected 422), extract (ok), unauthorized (401)
- [x] 3.2 Tests: bundle provenance and fn sharing, happy / fast /
      partial-extract / 401 / 422 replays, estimate calculations, schema
      gates with near-twins, live tests gated on `SPECSTREAM_API_KEY`
- [ ] 3.3 Replace synthetic fixtures via `deno task record` when a key
      exists

## 4. Wiring + docs

- [x] 4.1 `connectors/ids.lock.json`: the two new ids
- [x] 4.2 OpenSpec proposal / design / spec / tasks
- [x] 4.3 Verify: fmt, lint, check, test, double compile, version:check
