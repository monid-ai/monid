# Tasks: add-connector-datahyena

## 1. Drill the vendor surface

- [x] 1.1 Capture the published OpenAPI (`https://api.datahyena.com/v1/openapi.json`); pin base url, auth header, the six list routes' query params and the `limit` bounds (1 to 100, default 20)
- [x] 1.2 Confirm the meter: every success envelope carries `meta.creditsUsed` and `meta.creditsRemaining`; zero rows bill zero
- [ ] 1.3 Record live fixtures with a key (`deno task record`) and replace the synthetic ones

## 2. Provider and endpoints

- [x] 2.1 `provider.ts`: header auth, `/v1` baseUrl, timeouts, credit pool, vendor-meter `usage.consolidate`, `usage.evidence`
- [x] 2.2 `schema/common.ts`: shared filters (date, countries, industry groups, verticals, NAICS, domain, USD, paging)
- [x] 2.3 Six list endpoints with PER_UNIT·RESULT usage, `limit` required and capped, estimate = `limit`
- [x] 2.4 Replay tests: happy, empty, and the `limit` bound for each
- [x] 2.5 `ids.lock.json` entries
