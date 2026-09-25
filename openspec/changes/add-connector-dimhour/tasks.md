# Tasks: add-connector-dimhour

## 1. Drill the source

- [x] 1.1 Capture live `tools/list` from `https://mcp.dimhour.com/mcp`
      (2026-09-24): nine public read tools, all `readOnlyHint: true`
- [x] 1.2 One small live call per tool: every answer is HTTP 200 JSON with
      `result.structuredContent` plus the same payload as JSON text
- [x] 1.3 Error shapes, live: unknown tool / bad arguments / unknown city are
      `result.isError: true` in a 200; an unknown method is a JSON-RPC
      top-level `error` (-32601) in a 200; a non-JSON-RPC body is HTTP 400
- [x] 1.4 Terms, from https://dimhour.com/mcp.html: free tier and MCP
      Commercial ($499 / month, 250,000 calls included, then $2 per 1,000)

## 2. Provider

- [x] 2.1 `provider.ts`: base URL, MCP headers, optional `x-api-key`,
      timeouts, `lifecycle.start` classification, `output.fromResponse`
      unwrap, `output.fromError` digest
- [x] 2.2 `rate-card.ts`: `PER_CALL` against a `default` pool of Dim Hour
      calls, the open item stated in place

## 3. Endpoints (9)

- [x] 3.1 `list-cities` (no input)
- [x] 3.2 `search-venues`
- [x] 3.3 `get-venue`
- [x] 3.4 `list-new-venues`
- [x] 3.5 `list-curated`
- [x] 3.6 `find-places`
- [x] 3.7 `get-hours` (description warns hours are best-effort)
- [x] 3.8 `search`
- [x] 3.9 `fetch`

## 4. Fixtures + tests

- [x] 4.1 Nine live chains, trimmed (arrays to 2, strings to 240 chars)
- [x] 4.2 Live error chains: `rpc-error`, `tool-error`, `http-error`
- [x] 4.3 Synthetic chains: `synthetic-text-fallback`,
      `synthetic-text-malformed`, `synthetic-structured-preferred`
- [x] 4.4 `endpoints/<e>/endpoint.test.ts`, one per endpoint: happy,
      request envelope, both in-body errors, schema gate (rejects plus
      passing near-twins at each source bound, through the no-IO estimate),
      opt-in live shape check; `list-cities` pins that a stray body never
      reaches the wire
- [x] 4.4a `provider.test.ts`, provider-wide only: HTTP 400, fallback,
      malformed, structured-preferred, identity, auth, bulk-safety bounds
- [x] 4.5 Mutation check: breaking the `isError` test, the unwrap, or the
      malformed-text rule each fails the suite

## 5. Verification

- [x] 5.1 `deno fmt --check`, `deno task lint`, `deno task check`
- [x] 5.2 `deno task test` (full suite)
- [x] 5.3 Double compile, byte-identical
- [x] 5.4 `deno task version:check`
- [x] 5.5 `deno task catalog providers|endpoints|inspect` for dimhour
- [x] 5.6 `DIMHOUR_LIVE=1` live smoke: 9 calls, no credential

## 6. Open

- [ ] 6.1 Rate card: Dim Hour and Monid agree which terms cover Monid's
      traffic (free assistant tier, the $499 / month commercial key, or a
      separately agreed per-call or revenue-share rate); then the broker
      card prices the `default` pool

## 7. PR

- [x] 7.1 Open against `monid-ai/monid:main`
