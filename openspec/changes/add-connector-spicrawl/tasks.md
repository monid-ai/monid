# Tasks: add-connector-spicrawl

## 1. Drill the vendor surface

- [x] 1.1 Pin base url, bearer auth and the three request/response schemas from
      the OpenAPI
- [x] 1.2 Verify the meters live: scrape `credits`, job search `credits_used`;
      failures bill 0

## 2. Provider and endpoints

- [x] 2.1 `provider.ts`: bearer auth, credit pool, vendor-claim
      `usage.consolidate`, RFC 7807 `output.fromError`, price citations
- [x] 2.2 `scrape` — strict mirror, `toRequest` pins json, deduced estimate
- [x] 2.3 `jobs-search` — strict mirror without `find_contacts`, flat 2
- [x] 2.4 `brand` — strict mirror, flat 8 (full-browser rendering)

## 3. Fixtures + tests

- [x] 3.1 Record scrape, job search and a 401 via `deno task record`
- [x] 3.2 Minimize into provider-level chains: scrape-ok, jobs-search-ok,
      provider-error, synthetic-brand-ok (production does not serve brand yet)
- [x] 3.3 Per-endpoint tests: happy, provider error, schema gate with twin, live
- [x] 3.4 Scrape literal rate table; provider fn-provenance test

## 4. Wiring

- [x] 4.1 `ids.lock.json` gains the three ids
- [x] 4.2 Verify: fmt, lint, check, test
