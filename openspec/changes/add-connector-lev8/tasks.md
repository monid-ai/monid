# Tasks: add-connector-lev8

## 1. Provider

- [x] 1.1 provider.ts: bearer auth, `https://app.lev8.com`, `Accept`
      header, 10 min sync timeouts, one `default` pool, no consolidate
- [x] 1.2 Start-only provider lifecycle sending
      `Idempotency-Key: {runId}:call` (D3)

## 2. Endpoints (5)

- [x] 2.1 entity-search: pinned id, create → status → paged fetch
      lifecycle (D7), startup + per-result COMPOSITE (D8), `limit` /
      `enable_web_search` defaults at the binding
- [x] 2.2 contact-search: `email_found` / `phone_found` lines keyed by
      `contact_type`, found = non-empty trimmed content (D5)
- [x] 2.3 deep-search: PER_UNIT 2 on `success === true` (D4)
- [x] 2.4 enrich: PER_UNIT 2 on `success === true`, open inner JSON
      Schema (D4, D9)
- [x] 2.5 extract: `list_items` every 5 + flat `web2list` 80, `limit`
      default 100 (D6)

## 3. Fixtures + tests

- [x] 3.1 Recorded 401 (malformed token, 2026-10-16), shared by every
      endpoint via `{{request.url}}`
- [x] 3.2 Synthetic chains, only for paths a live call cannot trigger on
      demand: `success: false` (deep-search / enrich, extract); entity
      short fetch page, error with and without results, create 422,
      status 404, status 503, fetch 404
- [x] 3.3 Tests: catalog shape, Idempotency-Key per run, literal credit
      tables per rate line, estimates, schema gates (reject + accept),
      live tests gated on LEV8_API_KEY (shape, not amounts)
- [x] 3.4 Live token (2026-10-16): 5/5 live tests pass; happy chains
      re-recorded (deep-search, enrich, contact found / not found, extract
      list / web2list, entity done) and each settle matched Lev8's balance
      delta exactly (2, 2, 10, 0, 2, 80, 11)

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / design / spec
- [x] 4.2 Verify: fmt · lint · check · test · double-compile ·
      version:check · catalog smoke
