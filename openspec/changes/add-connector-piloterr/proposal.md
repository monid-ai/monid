# Proposal: add-connector-piloterr

## Why

Piloterr (https://www.piloterr.com) — Fetch any public web page as HTML, with JavaScript rendering, and detect its technologies. 3 synchronous GET endpoints, one API key, no new engine capability.

## What Changes

- **connectors/piloterr** — 3 endpoints, auth the `x-api-key` header, 120 s timeouts:
  - `piloterr#v2/website/crawler` (`GET /v2/website/crawler`, `web-scraping`): Fetch a page's HTML over plain HTTP. PER_CALL, 1 Piloterr credits.
  - `piloterr#v2/website/rendering` (`GET /v2/website/rendering`, `web-scraping`): Fetch a page's HTML after a headless browser runs its JavaScript. PER_CALL, 2 Piloterr credits.
  - `piloterr#v2/website/technology` (`GET /v2/website/technology`, `web-extraction`): Detect the technologies a website runs. PER_CALL, 1 Piloterr credits.
- **Billing**: Piloterr bills credits per successful request: the crawler 1 credit, rendering 2 credits, technology detection 1 credit (published pricing; measured in the Treg catalog run, 2026-11-09). No response carries a usage receipt, so the derived fold settles.
- Fixtures: `synthetic-` happy and 401 chains, shaped from the vendor OpenAPI spec and live calls made for the Treg catalog (2026-11-09). Replace via `deno task record` when `PILOTERR_API_KEY` exists.

## Capabilities

- `piloterr-connector`.

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION` unchanged, no new `Unit`, no new preset, no new hook, no new category leaf (`web-extraction`, `web-scraping` already exist).
