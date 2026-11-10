# Tasks: add-connector-autom

## 1. Provider

- [x] 1.1 provider.ts: auth the `x-api-key` header, baseUrl, 60 s timeouts, one `default` pool, provider-level PER_CALL 1 (no consolidate)

## 2. Endpoints (5)

- [x] 2.1 google-search: GET /v1/google/search, strict queryParams, PER_CALL 1
- [x] 2.2 google-news: GET /v1/google/news, strict queryParams, PER_CALL 1
- [x] 2.3 brave-search: GET /v1/brave/search, strict queryParams, PER_CALL 1
- [x] 2.4 duckduckgo-search: GET /v1/duckduckgo/search, strict queryParams, PER_CALL 1
- [x] 2.5 yahoo-search: GET /v1/yahoo/search, strict queryParams, PER_CALL 1

## 3. Fixtures + tests

- [x] 3.1 Synthetic happy and 401 chains per endpoint (shapes from the OpenAPI spec and Treg catalog live calls, 2026-11-09)
- [x] 3.2 Tests: happy (usage and payload), 401 (zero usage), input gates (required, unknown key), live gated on `AUTOM_API_KEY`
- [ ] 3.3 Replace synthetic fixtures via `deno task record` when `AUTOM_API_KEY` exists

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / spec / tasks
- [x] 4.2 `connectors/ids.lock.json` updated
- [x] 4.3 Verify: fmt · lint · check · test · ids:check
