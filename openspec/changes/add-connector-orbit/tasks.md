# Tasks: add-connector-orbit

## 1. Drill the vendor surface

- [x] 1.1 Capture the published v3 OpenAPI (`docs.orbitsearch.com/openapi.json`,
      Orbit API 3.0.0): 22 routes, `SearchRequest`, `StructuredIntent`,
      `IdentitySignals`, `EnrichRequest`, `BatchEnrichRequest`,
      `PopulationRequest`, and the `{status, error: {code, message}}` envelope
- [x] 1.2 Pin the rate card from `GET /v2/developer/pricing` (unauthenticated,
      version `2026-09-17`): `profile_read` 1, `index_search` 1 per 10
      results, `candidate_discovery` 1 per profile, `partial_profile` 5,
      `full_profile` 10; no $/credit pinned (the published
      package tiers are not uniform)
- [x] 1.3 Establish that NO search or enrich response carries a meter — only
      `population.credits_quoted` and a watcher run's `charge_amount` do
- [x] 1.4 Settle the billing algebra against Orbit's own settle: an index hit
      draws only its share of a block, a BUILT profile draws its depth line,
      a discovered person Orbit did not build draws 1, and a profile already
      at the requested depth draws nothing

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `https://api.orbitsearch.com` baseUrl,
      timeouts, the `default` credit pool, `output.fromError` over
      `{status, error: {code, message}}`; no lifecycle, no consolidate
- [x] 2.2 `schema/person-query.ts`: the `StructuredIntent` / `IdentitySignals`
      mirrors plus the shape shared by search and any future bulk item

## 3. Endpoints (4)

- [x] 3.1 `search` — mirror + vendor defaults at the binding + lifecycle whose
      poll accumulates the build signal + 4-line composite
- [x] 3.2 `profile-read` — declared identity `/v3/profile/{profile_id}`
      (the vendor path is shared with the build), flat 1 credit
- [x] 3.3 `enrich` — mirror + lifecycle following `links.status` + dispatch
      signal + 2-line composite
- [x] 3.4 `enrich-batch` — mirror + fan-out lifecycle over child request ids

## 4. Fixtures + tests

- [x] 4.1 12 provider-level chains (strategy v2), `synthetic-` prefixed until
      recorded: search async / indexed / discovery / failed / transient,
      enrich built / no-op / provider-error, batch, profile read, shared
      provider error
- [x] 4.2 18 replay tests, including the two zero-settle regressions the
      connector exists to get right — a cached search and a no-op enrich
- [x] 4.3 Estimate spot-checks against the published rate card
- [ ] 4.4 Record real chains and run `deno task test:live` once the dedicated
      provider key is in the platform's secret store

## 5. Verification

- [x] 5.1 `deno task fmt` · `lint` · `check` clean
- [x] 5.2 `deno task test` — full suite green
- [x] 5.3 `deno task version:check` — no contract-surface change
- [x] 5.4 Double-compile byte-identical
- [x] 5.5 `deno task catalog endpoints --provider orbit` lists all 6, and
      `catalog inspect` returns the approved copy and schemas
- [x] 5.6 Reconcile against Orbit's own published surfaces: `concepts/credits`
      (the settle rules), `skill.md` + `llms.txt` (the agent endpoint set),
      the hosted MCP server's four tools and the ChatGPT app's tool
      descriptions (scopes, the `regenerate` warning, quote-then-confirm)

## 6. Review follow-ups

- [x] 6.1 One status-read retry rule in all three lifecycles: `408`, `429` and
      EVERY `5xx` hold the run open (Orbit's error guide has one retry class,
      so a 501 or 520 from a proxy is the same answer as a 503)
- [x] 6.2 `Retry-After` (seconds) sets the next tick's cadence, clamped to
      [1s, 120s] — the v3 contract asks every caller to honor it.
      `shared/testing/fixtures.ts` gains `retry-after` in the recorded-header
      allowlist so the path is replay-testable
- [x] 6.3 The batch's FINAL sweep re-opens a transiently-unreadable child
      instead of publishing it `failed` — a failed row also dropped that
      child's depth line from evidence
- [x] 6.4 Usage fns read `operation` / `profile_depth` from the REQUEST; the
      response echo is not contractual and a missing one moved a 5-credit
      partial into the 10-credit branch
- [x] 6.5 `sources` is a UNION — a row carrying `candidate_discovery` stays
      off the cached-result line, matching Orbit's exclusion rule and its
      single-origin settle
- [x] 6.6 Every lifecycle follows `links.status`, the route the v3 guide tells
      callers to poll, with the documented path as fallback
- [x] 6.7 The single-use `personSearchShape` is inlined into the search body
      and `connectors/orbit/schema/` is gone — one call site, no abstraction
- [x] 6.8 Test matrix completed on the sync endpoint: provider-error,
      schema-gate and `liveSkip("orbit")` live cases; the rate card and its
      version are cited at the estimate assertions

## 7. Platform alignment (monid-services parity)

- [x] 7.1 The two free status reads are not catalog endpoints — the engine
      drives every poll inside the run; the lifecycles still poll both
      vendor routes
- [x] 7.2 A batch tick reads its children concurrently (status bucket 25/s,
      burst 150) so a tick takes the slowest child, not the sum
- [x] 7.3 Every submit carries `Idempotency-Key: {runId}:submit` off the
      host-stable run id, so a replayed start does not pay twice

## 8. Catalog positioning

- [x] 7.1 Provider and endpoint copy name the jobs an agent arrives with —
      a person the user just mentioned, a prospect before outreach, a
      candidate or counterparty under diligence, the people behind a company
      — with "maximum person context" kept as the spine
- [x] 7.2 No platform names and nothing about what Orbit already holds
- [x] 7.3 Runtime schema gates on every endpoint taking an input, and
      live tests asserting shape rather than amounts
