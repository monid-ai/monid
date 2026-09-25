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
      their synthetic provenance, four scrubbed recorded success fixtures and
      a real unauthenticated HTTP 401 fixture recorded without a key or paid
      scrape.
- [x] 2.2 Exercise each sealed endpoint's request shaping, response and rate.
- [x] 2.3 Cover HTTP errors, failed results in HTTP 200 bodies, empty/malformed
      success envelopes, input bounds and no-charge outcomes.
- [x] 2.4 Verify that balance, provisioning and people-search tools are absent.
- [x] 2.5 Repeat final formatting, lint, type checks, replay tests,
      deterministic double-compilation, version checks and catalog inspection
      after adding the authenticated recordings. All passed.

## 3. Documentation and review

- [x] 3.1 Add the connector README and OpenSpec proposal/specification.
- [x] 3.2 Verify automatic catalog discovery of all eleven tools through
      compilation tests; no manual root catalog table is required.
- [x] 3.3 Review the diff for secrets and implementation details outside the
      public API contract.

## 4. Live qualification and activation

- [x] 4.1 Qualify all eleven tools through the compiled engine with explicit
      public target inputs and an environment-supplied API key; keep the key
      out of files and test output. All eleven passed on 2026-09-22.
- [x] 4.2 Record and scrub four representative authenticated success responses,
      retaining synthetic boundary/error cases and the recorded HTTP 401.
- [ ] 4.3 Have maintainers confirm hosted credentials, activation and the
      commercial arrangement separately from connector correctness.

The 2026-09-22 live smoke run used `runEndpoint` in recording mode: eleven
passes, zero failures, one upstream request per tool, HTTP 200 and one
successful result each, with usage of $0.0009 USD per run. Total elapsed time
was approximately 47 seconds. Social profiles included recent posts; the
YouTube channel included recent uploads, within the default bounds of one page
and twelve uploads. This is a point-in-time check of those targets, not an SLA or
an assertion that all targets work. Final offline verification passed: 1,157
tests passed, zero failed and 201 credential-gated live tests were skipped.
The focused connector suite passed sixteen tests with one live test skipped.
