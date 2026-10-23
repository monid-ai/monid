# Proposal: add-connector-telnyx

## Why

[Telnyx Web Search](https://telnyx.com/products/web-search-api) is a web
search API for AI agents, billed through an existing Telnyx account with the
same API key as every other Telnyx API. Its search surface is one synchronous
POST with a JSON body — the exa precedent — so it needs no new engine
capability.

## What Changes

- **connectors/telnyx** — provider (`presets.auth.bearer()` on
  `https://api.telnyx.com/v2`, 30 s request/run budgets, one `default`
  US-dollar pool, no `usage.consolidate`: responses carry no cost receipt)
  and one endpoint, `telnyx#web_search` (`POST /web_search`, category
  `web-search`).
- **Billing** — PER_UNIT `RESULT` at $0.005, one unit per search whose
  `data.results.web` is non-empty, regardless of result count. Source:
  "$5 per 1,000 calls", https://telnyx.com/products/web-search-api FAQ,
  checked 2026-10-22. An empty result list bills the buyer 0 (search1api
  #40 / keenable posture — any upstream empty-call cost is not passed to the buyer). The evidence fn
  reads the array with strict `utils.json.len`, so a 2xx without
  `data.results.web` (or with a non-array value) fails `FN_CONTRACT` instead
  of settling as an empty search.
- **Input** — strict faithful mirror of the OpenAPI `WebSearchRequest`:
  query 1–2000, count 1–100, two-character country, safesearch enum,
  freshness string ≤ 20, include/exclude domain arrays ≤ 50, livecrawl
  boolean. No defaults injected. Include/exclude mutual exclusion is a
  cross-field rule documented in `meta.notes` and enforced by the vendor's
  400.
- **Fixtures** — five recorded (happy, omitted count, empty, 400
  include+exclude, 401 missing auth) and one `synthetic-` fixture (null
  optional news/image fields, passthrough only).
- **connectors/ids.lock.json** — one added id, `telnyx#web_search`.

## Capabilities

- `telnyx-connector`.

## Non-goals

- `POST /v2/contents` (page fetch) and the research endpoints — separate
  pricing; out of scope for this change.

## Impact

New connector tree plus one id-lock line. No schema/engine/compiler/config
change, no new category leaf or Unit — `ENGINE_VERSION` unchanged. No
`design.md` (plain port).
