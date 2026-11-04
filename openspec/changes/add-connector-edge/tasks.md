# Tasks: add-connector-edge

## 1. Provider + category

- [x] 1.1 provider.ts: bearer auth, baseUrl `https://getedge.cc/api/v1`,
      60 s timeouts, FREE model (no consolidate)
- [x] 1.2 `agent-skills` leaf in connectors/categories.ts

## 2. Endpoints (2)

- [x] 2.1 find_skill: POST /find_skill, strict body, query 3-500, limit 1-5
- [x] 2.2 use_skill: POST /use_skill, strict body, skill required,
      length caps from the server-side checks

## 3. Fixtures + tests

- [x] 3.1 Recorded find happy, use happy, use 404 (2026-11-03)
- [x] 3.2 Tests: wire form + shared bearer fn + FREE synthesized
      quantities, happy / 404 / schema gates (bound near-twins), live
      find and find -> use chain gated on EDGE_API_KEY
- [x] 3.3 ids.lock.json: `edge#find_skill`, `edge#use_skill`

## 4. Verify

- [x] 4.1 fmt · lint · check · test · live chain
