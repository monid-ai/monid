# Tasks: add-connector-string

## 1. Drill the vendor surface

- [x] 1.1 Read the published request/response reference for `/search` and
      `/fetch` (fields, defaults, status codes); pin base url and auth
- [x] 1.2 Verify the pricing model: `/search` is a flat per-page rate, with
      `aiOverview` billed as one search more; `/fetch` is one of the rates
      named by the response header `x-billed-request-type` — genuinely
      output-determined, not readable from the request
- [x] 1.3 Settle the open pricing question: which published plan tier to
      quote (String has no vendor-credits abstraction and no settle-time
      cost receipt) — resolved to the Growth tier throughout
- [x] 1.4 Map the endpoints onto String's `/v3` tool surface: search, a
      GET-only fetch, and a separate POST/PUT/PATCH request; the sitemap
      tools left for a later change (no published flat per-page rate)

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `/v1` baseUrl, timeouts, one credit
      pool labelled "US dollars (Growth-tier rate)"; no provider-level
      lifecycle

## 3. Endpoints (3)

- [x] 3.1 `search` — strict vendor-mirror body, `engine` narrowed to
      `google`/`google_ai_mode` and defaulted to `google` at the binding,
      `COMPOSITE` of `search` and `ai_overview` `PER_UNIT`·`PAGE` lines,
      estimate/evidence keyed off `searchCount`, `aiOverview` and
      `paging.pages`, and a zero settle for a search that comes back with
      nothing
- [x] 3.2 `fetch` — provider-shared strict `/fetch` mirror (`jsonSchema`
      excluded, no published flat rate), picked down to the GET fields with
      `format: markdown` and `solveCaptcha: false` defaults, single-tick
      `lifecycle.start` to capture `x-billed-request-type` off the raw
      response into `state.data` (the declarative `usage.evidence` path
      cannot see response headers), `COMPOSITE` of 5 `PER_UNIT`·`RESULT`
      components selected by that stashed value, estimate promises the
      cheaper proxy class on whichever strategy the request itself forces
- [x] 3.3 `request` — the same mirror picked down to the body-carrying
      fields, `method` required as POST/PUT/PATCH, `endpoint: "/request"`
      for its own id, `format: json` and `solveCaptcha: false` defaults,
      lifecycle and evidence fns byte-identical to `fetch`'s, `COMPOSITE`
      of the 2 request-based components

## 4. Fixtures + tests

- [x] 4.1 Provider-level shared chains: real `deno task record` captures
      (2026-10-24, hand-minimized) for the three happy paths and a no-match
      search; synthetic ones (`synthetic-` prefix), built from the vendor's
      own published example bodies, for the billed types and shapes a plain
      recording cannot produce
- [x] 4.2 Per-endpoint replay tests: `search` (one page, paged, AI overview,
      raw HTML, AI Mode, nothing back, schema defaults), `fetch` (happy path
      per billed-type fixture including non-default classes, so the test proves
      the correct line is picked rather than always the cheap floor; the
      defaults on the wire; the fns shared with `request`), `request`
      (standard and premium lines, a line outside its model, the defaults on
      the wire); each with a provider-error case (zero usage) and a schema
      gate (rejected inputs plus passing near-valid twins)
- [x] 4.3 Live tests for all three endpoints, gated on `liveSkip("string")`
- [x] 4.4 Provider rate table (`provider.test.ts`): every compiled
      endpoint has a row, and every billed line consumes the published
      Growth-tier rate

## 5. Wiring + verification

- [x] 5.1 `fmt` · `lint` · `check` · `test` (`connectors/string/`: every
      replay test passes, live tests skip without a key) ·
      `compiler:compile` (all three docs compile into the full catalog) —
      all green
- [x] 5.2 Full-repo `test` re-run after the `shared/testing/fixtures.ts`
      change, to confirm the widened `RECORDED_RES_HEADERS` allowlist
      doesn't affect any other connector's fixtures — green, no
      regressions
- [x] 5.3 Add the 3 ids to `connectors/ids.lock.json`
