# Tasks: add-connector-asin

## 1. Provider

- [x] 1.1 provider.ts: auth a `Bearer` token, baseUrl, 60 s timeouts, FREE model (no consolidate)

## 2. Endpoints (3)

- [x] 2.1 search: GET /search, strict queryParams, FREE
- [x] 2.2 history: GET /history, strict queryParams, FREE
- [x] 2.3 offers: GET /offers, strict queryParams, FREE

## 3. Fixtures + tests

- [x] 3.1 Synthetic happy and 401 chains per endpoint (shapes from the OpenAPI spec and Treg catalog live calls, 2026-11-09)
- [x] 3.2 Tests: happy (usage and payload), 401 (zero usage), input gates (required, unknown key), live gated on `ASIN_API_KEY`
- [ ] 3.3 Replace synthetic fixtures via `deno task record` when `ASIN_API_KEY` exists

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / spec / tasks
- [x] 4.2 `connectors/ids.lock.json` updated
- [x] 4.3 Verify: fmt · lint · check · test · ids:check
