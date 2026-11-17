# Proposal: add-connector-asin

## Why

Asin (https://www.asin.dev) — Search Amazon stores and read a product's price history and offers. 3 synchronous GET endpoints, one API key, no new engine capability.

## What Changes

- **connectors/asin** — 3 endpoints, auth a `Bearer` token, 60 s timeouts:
  - `asin#search` (`GET /search`, `amazon`): Search an Amazon store for products. Free.
  - `asin#history` (`GET /history`, `amazon`): Read the price history Asin has recorded for a product. Free.
  - `asin#offers` (`GET /offers`, `amazon`): Read the offers Asin has already collected for a product. Free.
- **Billing**: The three reads here are free on Asin: searching, the price history and the offers already known draw no credit (measured in the Treg catalog run, 2026-11-09: `charged: false`). Asin's credits pay for tracking and fresh checks, which this connector does not expose, so it declares no credit pool and every endpoint is FREE.
- Fixtures: `synthetic-` happy and 401 chains, shaped from the vendor OpenAPI spec and live calls made for the Treg catalog (2026-11-09). Replace via `deno task record` when `ASIN_API_KEY` exists.

## Capabilities

- `asin-connector`.

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION` unchanged, no new `Unit`, no new preset, no new hook, no new category leaf (`amazon` already exist).
