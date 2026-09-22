# Tasks: add-connector-refetcher

## 1. Provider and endpoints

- [x] 1.1 Add provider metadata, API-key authentication and the USD rate card.
- [x] 1.2 Add the eleven discoverable tools with unique logical endpoint paths
      and the shared upstream POST route.
- [x] 1.3 Bind one target, one profile page and at most twelve YouTube uploads;
      reject batch and multi-page inputs before sending a request.
- [x] 1.4 Estimate one successful unit and derive settled usage from result
      success, including zero usage for failures inside an HTTP 200 body.
- [x] 1.5 Preserve the response envelope and nullable platform-specific fields.

## 2. Offline verification

- [x] 2.1 Add minimal shared `synthetic-*` fixtures whose descriptions state
      their synthetic provenance, plus a real unauthenticated HTTP 401 fixture
      recorded without a key or paid scrape.
- [x] 2.2 Exercise each sealed endpoint's request shaping, response and rate.
- [x] 2.3 Cover HTTP errors, failed results in HTTP 200 bodies, empty/malformed
      success envelopes, input bounds and no-charge outcomes.
- [x] 2.4 Verify that balance, provisioning and people-search tools are absent.
- [x] 2.5 Run formatting, lint, type checks, replay tests, deterministic
      double-compilation, version checks and catalog inspection.

## 3. Documentation and review

- [x] 3.1 Add the connector README and OpenSpec proposal/specification.
- [x] 3.2 Verify automatic catalog discovery of all eleven tools through
      compilation tests; no manual root catalog table is required.
- [x] 3.3 Review the diff for secrets and implementation details outside the
      public API contract.

## 4. Live follow-up

- [ ] 4.1 Supply a dedicated API key and an explicit `REFETCHER_LIVE_INPUTS`
      target map through the environment and run the gated live tests; never
      commit the key or print it in test output.
- [ ] 4.2 Record and scrub representative authenticated success/error responses,
      replacing synthetic fixtures only after preserving their test coverage.
- [ ] 4.3 Have maintainers confirm hosted credentials, activation and the
      commercial arrangement separately from connector correctness.

The focused connector suite passed eleven tests with one live test skipped.
Full-repository verification passed: 1,152 tests passed, zero failed and 201
credential-gated live tests were skipped. Type checks, connector formatting/lint,
byte-identical double-compilation, version checks and catalog inspection passed. Synthetic replay success
and an unauthenticated 401 do not establish successful live scraping.
