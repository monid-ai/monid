# Tasks: add-connector-elfa

## 1. Vendor surface

- [x] 1.1 Pin the published OpenAPI (3.14.0): base url, auth header, the 24
      endpoints' params, published costs
- [x] 1.2 Check every mirror against Elfa's runtime validators; tighten where
      they are narrower than the published spec
- [x] 1.3 Confirm `x-elfa-credits` on every response (live, 2026-10-30)
- [x] 1.4 Confirm `x-elfa-credits-detail` on v3 live

## 2. Provider

- [x] 2.1 `provider.ts`: header auth, base url, timeouts, credit pool,
      comma-joining `toRequest`, header-relay `lifecycle.start`,
      `usage.consolidate`, `output.fromError`
- [x] 2.2 Allowlist `x-elfa-credits` and `x-elfa-credits-detail` in
      `RECORDED_RES_HEADERS`

## 3. Endpoints (24)

- [x] 3.1 v2: 8 flat endpoints; 180 s timeouts on `event-summary` and
      `trending-narratives`
- [x] 3.2 v3: 6 per-object lists, 5 limit-banded endpoints, 3 flat (one a
      POST with a body), 1 metric-banded, 1 free

## 4. Tests

- [x] 4.1 Catalog: every endpoint on the literal rate card; shared auth, relay,
      claim and error digest
- [x] 4.2 Billing: meter wins, detail agrees, malformed and zero meters fall
      back, errors settle zero
- [x] 4.3 Estimates and strict inputs
- [x] 4.4 Record `happy` fixtures for all 24 endpoints
- [x] 4.5 `ids.lock.json`
