# Tasks: add-connector-clay

## 1. Provider

- [x] 1.1 provider.ts: clay-api-key auth, baseUrl, timeouts (60/300/5),
      three credit pools, routine lifecycle start/poll, no consolidate, no
      output hooks
- [x] 1.2 schema/common.ts: shared zod fragments (search id + limit, the
      enrichment field mirrors with Clay's capitalized keys verbatim)

## 2. Endpoints (10)

- [x] 2.1 Search ×3: reference + create FREE, run PER_UNIT·RESULT on
      `search_result` with `search_id` as a pathParam, `limit` required at
      the binding, own estimate + evidence; all three override `start` with
      a plain relay
- [x] 2.2 Enrichment ×6 (company-domain, -employee-count, -industry,
      -job-openings, work-email, person): COMPOSITE two-pool models at the
      drill-measured draws, shared estimate + evidence
- [x] 2.3 mobile-phone: four lines (hit + miss × two pools) and the one
      doc-specific two-armed evidence
- [x] 2.4 v1 `notes` and `hints` carried into `meta.description`;
      mobile-phone's "not billed" note reworded for D3

## 3. Fixtures + tests

- [x] 3.1 Record every shape live (CLAY_API_KEY, 2026-09-16): routine hit,
      routine miss, start rejected, search create / run / empty / 404 /
      grammar 400 / reference
- [x] 3.2 Hand-minimize into four shared enrichment chains + six
      per-endpoint search fixtures; sanitize the account quota watermark
      and the real people out (D12)
- [x] 3.3 lifecycle.test.ts: all four chains × seven docs, the miss split,
      failed-item, start-rejected, doc surface, fn provenance, estimate
      purity
- [x] 3.4 Per-endpoint search tests: happy / empty / provider-error /
      schema-gate, plus live gated on CLAY_API_KEY
- [x] 3.5 Run test:live end to end (18 passed, including the real
      create → run flow)

## 4. PR #16 review

- [x] 4.1 enrich-person: bind the at-least-one-identifier rule as a
      compiled `anyOf` at the endpoint (D13), withdrawing the unverified
      "Clay answers 400" justification; a `.refine` compiles away silently
- [x] 4.2 Test the gate (rejections, both single-identifier arms, and the
      compiled `anyOf` surface); verified it fails when the union is
      flattened back
- [x] 4.3 spec: scope the non-2xx relay to TERMINAL answers and pin the
      three poll statuses that keep a run RUNNING; drop the tautological
      wording from the estimate scenario

## 5. Wiring + docs

- [x] 5.1 README connector row
- [x] 5.2 Verify: fmt · lint · check · test · double-compile ·
      version:check · catalog smoke · engine:estimate
