# Tasks: add-connector-pdl

## 1. Provider + schemas

- [x] 1.1 provider.ts: X-Api-Key auth, baseUrl, timeouts, one `default`
      pool, generic evidence (no consolidate — meter is header-only)
- [x] 1.2 schema/common.ts: shared enrichment/search fragments; refinement
      rules documented in describes

## 2. Endpoints (4)

- [x] 2.1 person-enrich / company-enrich: GET + queryParams, PER_CALL 1
      credit
- [x] 2.2 person-search / company-search: POST + body union, size required,
      PER_UNIT 1 credit/record, estimate = size

## 3. Fixtures + tests

- [x] 3.1 Synthetic fixtures (enrich happy + 404, search happy + empty,
      company flat envelope)
- [x] 3.2 Tests: provenance + pool + wire form, happy / empty / 404 /
      schema gates (size required, query XOR sql), live gated
- [ ] 3.3 Replace synthetic fixtures via `deno task record` when
      PDL_API_KEY exists; read `x-call-credits-spent` on a company call and
      re-pin the company `consumes.amount` if it is not a full credit (D2)

## 4. Wiring + docs

- [x] 4.1 README connector row
- [x] 4.2 Verify: fmt · lint · check · test · double-compile · version:check
      · catalog smoke
