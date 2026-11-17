# Tasks: add-connector-tavily

- [x] Inspect repository guidance and current Tavily OpenAPI/pricing.
- [x] Add provider, shared schemas, five tool definitions and the Research status reader.
- [x] Register the six new endpoint identities.
- [x] Add replay tests, synthetic fixtures and gated live smoke tests.
- [x] Run focused tests, format, lint, full typecheck and full offline suite.
- [x] Check deterministic compilation, catalog entries and estimates.
- [x] Audit connector conventions and the full documented REST input surface, including nested Research schemas and separately documented tracking headers.
- [x] Complete a final simplicity/correctness review and run all five live provider smoke tests with user approval.
- [x] Obtain user authorization to open the PR after the final review and live provider tests.
- [ ] Verify hosted Monid E2E before production rollout.

## Verification notes

- Full offline suite: 1,337 passed, 0 failed, 226 credential-gated skips
  (`DENO_JOBS=4 deno task test --parallel`, 2026-10-26). Tavily contributes
  39 passing replay/contract tests and 5 gated live tests.
- Full typecheck, scoped formatting/lint and engine version gate pass.
- Two forced compiles with frozen metadata produced identical SHA-256 hashes.
- All 72 POST fields and both status-reader inputs match the published
  OpenAPI surface. Recursive property/type/enum/numeric/array-bound comparison
  includes nested Research output schemas and files. Crawl/Map additionally
  require a limit and Research binds stream=false. All top-level catalog inputs
  have descriptions, including dependencies and managed behavior.
- Full-parameter requests survive compiled validation and reach mocked transport
  unchanged except connector-owned usage settings. Tests cover status-reader
  auth, attribution, encoded IDs, optional query values, bodyless GETs, Research
  local stop/recoverable state and the 30-minute deadline without resubmission.
- Connector review confirmed provider inheritance, native mirrors, binding
  defaults, transport-owned auth, endpoint-only lifecycle, sealed-unit testing
  and native settlement. Optional tracking headers (X-Project-ID, X-Session-Id,
  X-Human-Id) are documented limitations of the current per-call input boundary;
  they are not falsely advertised as body parameters. SSE remains unsupported.
- All six catalog IDs are present. The repository-wide identity check still
  reports 78 unregistered and 7 obsolete non-Tavily IDs, identical to the
  pre-change drift. Only the six new Tavily IDs were added to the lock.
- Independent contract review found no further high-confidence defects.
- Final cleanup removed the Research status endpoint's redundant identity
  override; its public ID continues to derive from the same request path.
  All 33 files serve the connector, its tests/docs, or the required OpenSpec
  record. No engine, compiler, dependency or unrelated connector changes.
- Live provider smoke tests: 5 passed, 0 failed (2026-10-26), using the compiled
  connector and the ignored local credential. Search, Extract, Crawl and Map
  returned nonempty results and valid native usage; mini Research completed
  with a cited report and positive native usage. One Research job was submitted.
  The standalone status reader remains covered by offline contract tests.
- Hosted Monid E2E remains pending. Fixtures
  remain synthetic; the successful live runs did not replace them with recordings.
