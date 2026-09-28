# Proposal: add-connector-keenable

## Why

Keenable (keenable.ai) is another search-and-fetch provider in the same
class as Exa, Firecrawl, TinyFish, and Octen: ranked web search plus a
page-content fetch, one API key, REST. Two synchronous endpoints, no new
engine capability. The published surface is small and stable
(`POST /v1/search`, `GET /v1/fetch`; OpenAPI 2026-09-16).

## What Changes

- **connectors/keenable** — 2 endpoints, `X-API-Key` auth, 30 s timeouts:
  - `keenable#v1/search` (`POST /v1/search`): ranked results with title,
    URL, description, snippet, publication and index timestamps; site /
    date / point-in-time filters; snippet length and result-count caps.
    PER_CALL, 1 Keenable credit.
  - `keenable#v1/fetch` (`GET /v1/fetch`): markdown for a known indexed
    URL; optional `max_chars` and a `prompt` extraction instruction.
    PER_CALL, 1 Keenable credit. Live fetch is not exposed (D4).
- **One credit pool** `default` ("Keenable credits") and a provider-level
  `PER_CALL` model inherited by both docs. No `usage.consolidate`: REST
  responses carry no usage receipt (MCP's `_meta["keenable/usage"]` is
  not on this surface).
- Fixtures: search/fetch 401s are RECORDED (malformed key against the
  keyed paths, 2026-09-16). Happy paths are `synthetic-`, shaped from
  real public-twin traffic the same day, URL rewritten to the
  authenticated paths the docs call.

## Capabilities

- `keenable-connector`.

## Non-goals

- The keyless `/v1/search/public` and `/v1/fetch/public` twins
  (`X-Keenable-Title`, shared per-IP pool, unmetered) — evaluation-only.
- Search `mode` (realtime vs pro) as a request field — Keenable decides
  it per call; MCP `_meta["keenable/overrides"]` is not an HTTP
  parameter.
- Live fetch (`live=true` / `fetch.live`) — a different SKU that "draws
  more than one" credit without a published number, and REST has no
  receipt to settle against.

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION`
unchanged, no new `Unit`, no new preset, no new hook, no new category
leaf (`web-search` / `web-scraping` already exist).
