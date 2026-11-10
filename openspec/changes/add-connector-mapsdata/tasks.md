# Tasks: add-connector-mapsdata

## 1. Provider + schemas

- [x] 1.1 provider.ts: bearer auth, baseUrl, 30 s timeouts, one `default`
      pool ("MapsData leads"), provider-level FREE, error-envelope
      `fromError`
- [x] 1.2 jobs/schema/inputs.ts: strict mirror of `ScrapeCreate`, minus
      `client_id` (design D1)

## 2. Endpoints (4)

- [x] 2.1 jobs: POST /jobs, async start/poll/stop on the endpoint,
      download-link and CSV follow (D2), PER_UNIT RESULT with the
      `email_count` claim (D4), `total_limit` required, country enum
- [x] 2.2 categories: GET /categories, `q` required at the binding
- [x] 2.3 categories/validate: GET /categories/validate
- [x] 2.4 regions: GET /regions, country enum

## 3. Fixtures + tests

- [x] 3.1 Synthetic chains: succeeded, transient, no-emails, failed,
      submit-rejected, unauthorized, dry-run, and the three lookups
- [x] 3.2 Tests: provenance, lifecycle placement, CSV parse edge cases,
      settle and estimate, zero-billed errors, schema gates and their
      complement, live (category check and dry run, gated on
      `MAPSDATA_API_KEY`)
- [ ] 3.3 Replace synthetic fixtures via `deno task record` once the
      platform's MapsData key exists

## 4. Wiring + docs

- [x] 4.1 ids.lock.json: the four new ids
- [x] 4.2 OpenSpec proposal / design / spec
