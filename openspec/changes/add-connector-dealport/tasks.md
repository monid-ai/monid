# Tasks: add-connector-dealport

## 1. Vendor surface and taxonomy

- [x] 1.1 Verify live OpenAPI 3.1 spec (`https://app.dealport.com/openapi/v1.json`):
      Bearer auth, `/api/v1/*` routes, request schemas, response envelopes, and
      published plain-USD rates
- [x] 1.2 Add `real-estate` leaf category to `connectors/categories.ts`

## 2. Provider and shared schemas

- [x] 2.1 `connectors/dealport/provider.ts`: Bearer auth, baseUrl
      `https://app.dealport.com`, US dollar pool, provider-wide receipt
      `usage.consolidate`
- [x] 2.2 `connectors/dealport/schema/common.ts`: shared UUID, NYC BBL,
      company buy-box filter fields, and owner lookup request mirror

## 3. Endpoints (9)

- [x] 3.1 `preview-companies` (`POST /api/v1/companies/preview`, `FREE`)
- [x] 3.2 `match-company-list` (`POST /api/v1/companies/match`, `FREE`,
      stateless matching binding)
- [x] 3.3 `search-companies` (`GET /api/v1/companies`, $0.01 per new Record)
- [x] 3.4 `search-buildings` (`GET /api/v1/buildings`, $0.01 per new Record)
- [x] 3.5 `get-record` (`GET /api/v1/records/{id}`, $0.01 per new Record)
- [x] 3.6 `fetch-company-pages` (`POST /api/v1/pages`, $0.01 per live fetch,
      $0.00 cached)
- [x] 3.7 `find-owner` (`POST /api/v1/owners`, $0.09 per verified hit, $0.00
      miss)
- [x] 3.8 `find-contact` (`POST /api/v1/contacts`, $0.09 per verified hit,
      $0.00 miss)
- [x] 3.9 `research-building-owners` (`POST /api/v1/buildings/owners`, $0.00
      quote / $0.05 per NYC building owner resolved)
- [x] 3.10 Register the 9 `dealport#api/v1/*` ids in `connectors/ids.lock.json`

## 4. Fixtures, tests, and verification

- [x] 4.1 Synthetic PII-free replay fixtures (`synthetic-*.json`) for happy,
      empty/miss/cached/quote/repeat, and provider error cases across all 9
      endpoints
- [x] 4.2 `endpoint.test.ts` on all 9 endpoints (happy, zero-charge edge cases,
      provider error, bidirectional schema gate, and `liveSkip("dealport")`
      live test) plus `provider.test.ts` literal rate table and fnTable
      interning assertions
- [x] 4.3 Pass `deno task check`, `deno task test`, double deterministic
      `deno task compiler:compile`, `deno task catalog inspect`, and
      `deno task version:check`
