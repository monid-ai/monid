# Proposal: add-connector-autom

## Why

Autom (https://www.autom.dev) — Live Google, Google News, Brave, DuckDuckGo and Yahoo results as structured JSON. 5 synchronous GET endpoints, one API key, no new engine capability.

## What Changes

- **connectors/autom** — 5 endpoints, auth the `x-api-key` header, 60 s timeouts:
  - `autom#v1/google/search` (`GET /v1/google/search`, `web-search`): Search Google and get the live organic results. PER_CALL, 1 Autom credits.
  - `autom#v1/google/news` (`GET /v1/google/news`, `news-search`): Search Google News and get the live articles. PER_CALL, 1 Autom credits.
  - `autom#v1/brave/search` (`GET /v1/brave/search`, `web-search`): Search Brave and get the live organic results. PER_CALL, 1 Autom credits.
  - `autom#v1/duckduckgo/search` (`GET /v1/duckduckgo/search`, `web-search`): Search DuckDuckGo and get the live organic results. PER_CALL, 1 Autom credits.
  - `autom#v1/yahoo/search` (`GET /v1/yahoo/search`, `web-search`): Search Yahoo and get the live organic results. PER_CALL, 1 Autom credits.
- **Billing**: Autom bills 1 credit per successful request, whatever the engine (published pricing; measured in the Treg catalog run, 2026-11-09). Failed requests are free. No response carries a usage receipt, so there is no `usage.consolidate` and the derived fold settles.
- Fixtures: `synthetic-` happy and 401 chains, shaped from the vendor OpenAPI spec and live calls made for the Treg catalog (2026-11-09). Replace via `deno task record` when `AUTOM_API_KEY` exists.

## Capabilities

- `autom-connector`.

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION` unchanged, no new `Unit`, no new preset, no new hook, no new category leaf (`news-search`, `web-search` already exist).
