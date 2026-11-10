# Tasks: add-connector-fxmacrodata

## 1. Provider + schemas

- [x] 1.1 provider.ts: optional `apiKey`, inject `X-API-Key` only when
      present, baseUrl, 30 s timeouts, provider-level FREE, no consolidate
- [x] 1.2 schema/common.ts: the 22-code currency enum, indicator slug,
      date string
- [x] 1.3 categories.ts: `economic-data` leaf

## 2. Endpoints (5)

- [x] 2.1 data_catalogue/{currency}: include_capabilities,
      include_coverage, indicator
- [x] 2.2 announcements/{currency}/latest: path only
- [x] 2.3 announcements/{currency}/{indicator}: dates, pagination, fields,
      series selectors; limit 1–100, offset ≥ 0, page ≥ 1 at the binding
- [x] 2.4 calendar/{currency}: 22 codes + COMM; indicator, dates, timezone
- [x] 2.5 forex/{base}/{quote}: dates, pagination, indicators

## 3. Fixtures + tests

- [x] 3.1 Recorded keyless chains (2026-10-15): USD catalogue, latest,
      inflation history, calendar; 401 for EUR/USD FX. Large bodies trimmed
      to two rows
- [x] 3.2 Tests: bundle shape (5 ids, FREE, one inject fn, optional key),
      the wire with and without a key, happy / 401 / schema gates per
      endpoint, live gated on FXMACRODATA_API_KEY

## 4. Verify

- [x] 4.1 check · lint · fmt · test
