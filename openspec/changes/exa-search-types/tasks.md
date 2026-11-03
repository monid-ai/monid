# Tasks: exa-search-types

## 1. exa#search

- [x] 1.1 schema/inputs.ts: `type` enum gains `lite`
- [x] 1.2 endpoint.ts: per-type PER_UNIT cells + `additional_result` +
      `summary`; estimate and evidence select the cell from the bound
      `type` (default `auto`)
- [x] 1.3 meta: summary, description and a lite-limits note

## 2. New endpoints

- [x] 2.1 search-lite: `endpoint: "/search/lite"`, wire `POST /search`,
      lite parameter subset, `toRequest` merges `type: "lite"`; PER_CALL
      $0.004 + `additional_result`
- [x] 2.2 search-deep: `endpoint: "/search/deep"`, wire `POST /search`,
      `type` ∈ deep-lite/deep/deep-reasoning (default deep), 180 s budget,
      per-type cells + `additional_result` + `summary`

## 3. Fixtures + tests

- [x] 3.1 Recorded happy + 401 for both new endpoints (2026-11-02),
      `requestTags`/`effectiveFilters` removed
- [x] 3.2 exa#search: happy/live evidence moves to `standard_search`;
      estimate per type; extra results + summaries ($0.018 case)
- [x] 3.3 search-lite: identity + advertised schema, happy (claim =
      fold), 401, estimate, unsupported-field gate with a passing near-twin,
      live (finite nonnegative usage, receipt removed, no mismatch)
- [x] 3.4 search-deep: happy with `output.content`/`grounding`, 401,
      type gate with a passing near-twin, estimate, live deep-reasoning

## 4. Wiring

- [x] 4.1 ids.lock.json: `exa#search/deep`, `exa#search/lite`
- [x] 4.2 Verify: fmt · lint · check · test · test:live (exa) ·
      double-compile · version:check · ids:check · engine:run smoke
