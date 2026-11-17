# Tasks: add-connector-capturekit

## 1. Provider

- [x] 1.1 provider.ts: auth the `x-api-key` header, baseUrl, 120 s timeouts, one `default` pool, provider-level PER_CALL 1 (no consolidate)

## 2. Endpoints (3)

- [x] 2.1 content: GET /v1/content, strict queryParams, PER_CALL 1
- [x] 2.2 analyze: GET /v1/analyze, strict queryParams, PER_CALL 1
- [x] 2.3 website-crawler: GET /v1/website/crawler, strict queryParams, PER_CALL 1

## 3. Fixtures + tests

- [x] 3.1 Synthetic happy and 401 chains per endpoint (shapes from the OpenAPI spec and Treg catalog live calls, 2026-11-09)
- [x] 3.2 Tests: happy (usage and payload), 401 (zero usage), input gates (required, unknown key), live gated on `CAPTUREKIT_API_KEY`
- [ ] 3.3 Replace synthetic fixtures via `deno task record` when `CAPTUREKIT_API_KEY` exists

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / spec / tasks
- [x] 4.2 `connectors/ids.lock.json` updated
- [x] 4.3 Verify: fmt · lint · check · test · ids:check
