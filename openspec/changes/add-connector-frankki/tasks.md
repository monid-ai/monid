# Tasks: add-connector-frankki

## 1. Provider + schemas

- [x] 1.1 provider.ts: X-FrankKi-Lane-Key auth, baseUrl, timeouts, FREE
      model, envelope `fromResponse` / `fromError` (D2, D3)
- [x] 1.2 schema/common.ts: address, sender, recipient, token and delivery
      type fragments shared by 2+ endpoints
- [x] 1.3 `postal-mail` leaf in connectors/categories.ts

## 2. Endpoints (6)

- [x] 2.1 quote, address-check, compose, preview, checkout, track; per-
      endpoint timeouts (D4)

## 3. Fixtures + tests

- [x] 3.1 Recorded happy + 401 per endpoint (2026-10-27), tokens and signed
      URLs replaced (D5)
- [x] 3.2 Synthetic 202 review hold and 422 content refusal
- [x] 3.3 endpoint.test.ts per endpoint: happy, provider error, schema gate
      with near-twins, live gated on liveSkip("frankki"); provider.test.ts
      holds provenance
- [x] 3.4 Live suite run against production with the key (6/6)

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / design / spec
- [x] 4.2 Verify: fmt · lint · check · test
