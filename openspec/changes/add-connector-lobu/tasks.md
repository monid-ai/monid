# Tasks: add-connector-lobu

## Implementation

- [x] Keyless FREE provider with focused public-research metadata and caveats
- [x] One endpoint: read_knowledge for direct search and source reading
- [x] Remove company lookup, SDK discovery, unsupported categories, unverified
      counts, and incorrect newcomer/managed-OAuth instructions
- [x] Preserve provider input fields, enforce binding bounds, preserve responses
- [x] Keep only the reader's Lobu ID in ids.lock.json

## Validation

- [x] Replay, egress, provider-error, input-gate, timeout, and fixture-size tests
- [x] Opt-in live direct-search-to-source-read proof: 11 tests passed
- [x] Two bounded relevance checks with source dates and links (see proposal)
- [x] Final scoped formatting/lint/typecheck and deterministic double compile
- [x] Final version gate and intended-file diff inspection (14 intended files)
- [x] Compare full check/test failures and IDs drift with untouched origin/main:
      24 existing OpenAI test typing errors; identical unrelated IDs drift

Commands: `deno task test connectors/lobu/provider.test.ts` (10 passed, live
ignored); `LOBU_LIVE=1 deno task test:live connectors/lobu/provider.test.ts`
(11 passed); `deno fmt --check connectors/lobu`; `deno lint connectors/lobu`;
`deno task compiler:compile` twice (identical catalog SHA-256
`d5f8709dc52da891b35545a1ba6f9487f5f1baf614bfd0bd76f458f7b236914c`);
`deno task version:check`. Full `check` and `test` fail typechecking before
runtime tests; their 24 diagnostic messages match the clean upstream baseline.

## Market operating readiness before submission

- [x] Repeat the actual Monid live tests (11 passed), assert no Authorization/Cookie,
      and check search pagination and source-version reads
- [x] Broaden anonymous query checks and test query-only defaults and empty reads
- [x] Fresh signed-out browser: both source permalinks, history, and Memory navigation
- [x] Record relevance, duplicates, mixed freshness, and Cloudflare findings
- [x] Obtain user-approved Market maintenance access via a separate CLI context
      (the connected integration grant remains unchanged)
- [x] Inspect connections, feeds, runs, and ingestion; restore two public Reddit
      feeds, collect 141 items, and verify new material through anonymous reads
- [x] Re-run all 11 Monid tests after maintenance; no credential headers sent
- [x] Repair the installed Trustpilot browser contract using existing version 2.1.1;
      complete dry-run and real 20-review collection, then anonymous search/read
- [x] Configure daily refresh for the repaired public feeds; future scheduled runs
      remain unobserved
- [x] Explicitly bound relevance, duplicate rows, source freshness, page sampling,
      brand-text filtering, and hosted-egress limitations before submission

## Hosted launch (not established by local validation)

- [ ] Confirm hosted empty-credential configuration and shared-egress capacity
- [ ] Validate hosted discover/inspect/run for the example tasks
- [ ] Confirm optional homepage continuation meets Monid listing policy
- [ ] Prove first-time signup and account/browser authorization with human control
- [ ] Measure discovery relevance, sourced answer success, and optional adoption

## Deferred separate work

- [ ] Resolve publication rules before offering public company/entity lookup
- [ ] Land the separate Lobu access-tier-aware entity-lookup guidance fix

PR submission is a review handoff; no hosted launch is claimed by these tasks.
