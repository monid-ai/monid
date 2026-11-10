# Proposal: add-connector-capturekit

## Why

CaptureKit (https://www.capturekit.dev) — Any web page as clean Markdown, an AI summary of a website, or its raw HTML. 3 synchronous GET endpoints, one API key, no new engine capability.

## What Changes

- **connectors/capturekit** — 3 endpoints, auth the `x-api-key` header, 120 s timeouts:
  - `capturekit#v1/content` (`GET /v1/content`, `web-scraping`): Get a page as Markdown with its metadata and links. PER_CALL, 1 CaptureKit credits.
  - `capturekit#v1/analyze` (`GET /v1/analyze`, `web-extraction`): AI analysis of a website: summary, value proposition, features, use cases. PER_CALL, 1 CaptureKit credits.
  - `capturekit#v1/website/crawler` (`GET /v1/website/crawler`, `web-scraping`): Fetch a page's raw HTML without rendering. PER_CALL, 1 CaptureKit credits.
- **Billing**: CaptureKit bills 1 credit per successful request on each endpoint here (published pricing; measured in the Treg catalog run, 2026-11-09). No response carries a usage receipt, so the derived fold settles.
- Fixtures: `synthetic-` happy and 401 chains, shaped from the vendor OpenAPI spec and live calls made for the Treg catalog (2026-11-09). Replace via `deno task record` when `CAPTUREKIT_API_KEY` exists.

## Capabilities

- `capturekit-connector`.

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION` unchanged, no new `Unit`, no new preset, no new hook, no new category leaf (`web-extraction`, `web-scraping` already exist).
