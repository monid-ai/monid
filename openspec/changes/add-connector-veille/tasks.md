# Tasks: add-connector-veille

## 1. Provider

- [x] 1.1 provider.ts: auth the `x-api-key` header, baseUrl, 60 s timeouts, one `default` pool, provider-level PER_CALL 1 (no consolidate)

## 2. Endpoints (6)

- [x] 2.1 email: GET /v1/intelligence/email, strict queryParams, PER_CALL 3
- [x] 2.2 emailq: GET /v1/intelligence/emailq, strict queryParams, PER_CALL 5
- [x] 2.3 domain: GET /v1/intelligence/domain, strict queryParams, PER_CALL 2
- [x] 2.4 phone: GET /v1/intelligence/phone, strict queryParams, PER_CALL 1
- [x] 2.5 vat: GET /v1/vat, strict queryParams, PER_CALL 1
- [x] 2.6 iban: GET /v1/vat/iban, strict queryParams, PER_CALL 1

## 3. Fixtures + tests

- [x] 3.1 Synthetic happy and 401 chains per endpoint (shapes from the OpenAPI spec and Treg catalog live calls, 2026-11-09)
- [x] 3.2 Tests: happy (usage and payload), 401 (zero usage), input gates (required, unknown key), live gated on `VEILLE_API_KEY`
- [ ] 3.3 Replace synthetic fixtures via `deno task record` when `VEILLE_API_KEY` exists

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / spec / tasks
- [x] 4.2 `connectors/ids.lock.json` updated
- [x] 4.3 Verify: fmt · lint · check · test · ids:check
