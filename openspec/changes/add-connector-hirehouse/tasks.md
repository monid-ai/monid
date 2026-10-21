# Tasks: add-connector-hirehouse

## 1. Provider

- [x] 1.1 provider.ts: baseUrl, `X-HireHouse-Source: monid` header,
      optional `apiKey` credential injected as `X-HireHouse-Key` only when
      set, 30 s timeouts, category `jobs`

## 2. Endpoints (3)

- [x] 2.1 search: GET /jobs/search, strict queryParams, FREE
- [x] 2.2 job: GET /jobs/{id}, strict UUID pathParam, FREE
- [x] 2.3 compare: GET /jobs/compare, strict `ids` queryParam, FREE

## 3. Fixtures + tests

- [x] 3.1 Synthetic happy chains for all three endpoints; synthetic 429
      (search) and 404 (job, compare) error chains
- [x] 3.2 Tests per endpoint: happy (whole-body equality, FREE usage),
      provider error (data, zero usage), schema gate (INVALID_INPUT plus a
      passing near-twin), live gated on HIREHOUSE_API_KEY; provider test for
      FREE / `jobs` / source header across all three
- [ ] 3.3 Replace synthetic happy fixtures via `deno task record` now that
      the API is live

## 4. Wiring + docs

- [x] 4.1 `connectors/ids.lock.json`: three ids
- [x] 4.2 OpenSpec proposal / spec
- [x] 4.3 Verify: fmt · lint · check · test
