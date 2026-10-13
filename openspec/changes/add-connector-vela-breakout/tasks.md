# Tasks: add-connector-vela-breakout

## 1. Drill the vendor surface

- [x] 1.1 Capture the published OpenAPI (2026-10-12): base url, bearer auth,
      the five GET parameter schemas, the status codes (400/401/402/404/429/
      503), the prices ($0.02 a ranked list, $0.01 `/company`) and the free `/groups`
- [x] 1.2 Confirm no response body carries a cost or credit field

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `/api/v1` baseUrl, 30 s timeouts, one
      `default` pool ("US dollars"), provider-level PER_CALL 0.02 (`/company` 0.01), no
      consolidate
- [x] 2.2 `schema/common.ts`: the shared `limit` (1-25)
- [x] 2.3 `categories.ts`: new `market-trends` leaf

## 3. Endpoints (5)

- [x] 3.1 `groups` — no input, FREE
- [x] 3.2 `breakouts` — `group` enum required, window/limit/min_size/steady
- [x] 3.3 `company` — `name_or_domain` 2-120 required
- [x] 3.4 `ideas` — `direction` enum required, `limit`
- [x] 3.5 `rising-companies` — `limit`

## 4. Fixtures + tests

- [x] 4.1 Synthetic provider-level chains from real captured responses,
      trimmed: groups-ok, breakouts-ok, company-ok, company-not-found,
      ideas-ok, rising-companies-ok, unauthorized
- [x] 4.2 Tests: bundle shape (ids, auth, pool, models, no consolidate),
      happy / 404 / 401 replay with usage, estimate, schema gates, live
      gated on `VELA_BREAKOUT_API_KEY`
- [x] 4.3 Live: `deno task test:live` green against production
      (2026-10-12, all five endpoints). Fixtures stay synthetic (real
      bodies, trimmed) so replay asserts stable figures

## 5. Wiring + verify

- [x] 5.1 `ids.lock.json` entries
- [x] 5.2 Verify: fmt · lint · check · test · catalog inspect
