# Tasks: add-connector-proctorai

## 1. Provider + schemas

- [x] 1.1 provider.ts: Bearer auth, baseUrl, 300 s timeouts, one
      `default` pool, PER_CALL 0.4, consolidate plucks `$.billing`
- [x] 1.2 grade/schema/inputs.ts: faithful strict mirror of the request
      body (optionality only)
- [x] 1.3 `education` leaf in connectors/categories.ts

## 2. Endpoint

- [x] 2.1 grade: POST /api/v1/grade, `endpoint: "/grade"`, vendor bounds
      at the binding, cross-field rule in `notes`

## 3. Fixtures + tests

- [x] 3.1 Recorded 401 (production, unknown key); synthetic happy and 402
- [x] 3.2 Tests: wire form + model, receipt settles 0.4 and `billing` is
      stripped, 402/401 zero usage, input bounds, live gated on
      PROCTORAI_API_KEY
- [ ] 3.3 Replace synthetic fixtures via `deno task record` once a
      platform key exists

## 4. Verify

- [x] 4.1 fmt · lint · check · test
