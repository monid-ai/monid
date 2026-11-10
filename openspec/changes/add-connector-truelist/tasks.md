# Tasks: add-connector-truelist

## 1. Provider + schema

- [x] 1.1 provider.ts: Bearer auth, baseUrl, 60 s timeouts, one
      `default` pool (no consolidate)
- [x] 1.2 verify-inline schema: strict queryParams, `email` required

## 2. Endpoint

- [x] 2.1 verify-inline: POST /api/v1/verify_inline, people-enrichment;
      PER_UNIT RESULT 1 credit, unknown / accept_all bill 0

## 3. Fixtures + tests

- [x] 3.1 Recorded live 2026-10-15: ok, role, invalid, catch-all,
      unknown (timed_out), 401, 429
- [x] 3.2 Tests: verdict → usage table, 401/429 zero usage, input gates,
      wiring; live gated on TRUELIST_API_KEY

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / spec / tasks; ids.lock.json
- [x] 4.2 Verify: fmt · lint · check · test · test:live · ids:check ·
      version:check
