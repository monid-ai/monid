# Proposal: add-connector-lev8

## Why

Lev8 (lev8.com) is a lead-discovery and research API: find companies,
people and creators from a natural-language objective, find one contact's
email or phone, answer a research question, fill a JSON Schema of fields
for a known entity, and extract social, GitHub or web-page lists. It fills
gaps the catalog does not cover today — creator discovery across X,
YouTube, TikTok and Instagram, Shopify stores, and Xiaohongshu / WeChat
Official Accounts — behind one bearer token and one credit pool. The
published surface is small (docs.lev8.com, OpenAPI 2026-10-16).

## What Changes

- **connectors/lev8** — bearer auth (`lev8_live_` token), base URL
  `https://app.lev8.com`, one credit pool `default` ("Lev8 credits"), no
  `usage.consolidate`. Five endpoints:
  - `lev8#v1/entity-search` — async. One run drives
    `POST /v1/entity-search/create_task` → `GET /status` → `GET /fetch`
    (paged to `ready_count`). Startup 5 credits (20 with
    `enable_web_search`) + 2 per entity (10 per creator); a terminal
    `error` refunds the startup but bills and returns its ready entities.
  - `lev8#v1/contact-search` — 10 credits per email found, 30 per phone
    found, 0 when not found.
  - `lev8#v1/deep-search` — 2 credits when `success: true`.
  - `lev8#v1/enrich` — 2 credits when `success: true`.
  - `lev8#v1/extract` — social / GitHub lists 1 credit per 5 items
    (rounded up); `web2list` 80 per successful page.
- **Idempotency** — every paid call sends
  `Idempotency-Key: {runId}:<op>`, so a retried run replays Lev8's saved
  response instead of paying twice.
- Fixtures: the 401 is RECORDED (malformed token, 2026-10-16) and shared by
  every endpoint. Happy and zero-bill paths are `synthetic-`, shaped from
  the OpenAPI and Lev8's response structs.

## Capabilities

- `lev8-connector`.

## Non-goals

- `GET /v1/credit/balance` — on a broker it would show every caller the
  shared house account (design D2).
- A caller-supplied `Idempotency-Key` — the run id is the only idempotency
  identity (design D3).
- Separate catalog endpoints for `status` and `fetch` — the lifecycle
  drives them inside the run (design D7).

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION`
unchanged, no new `Unit`, no new preset, no new hook, no new category leaf
(`company-enrichment`, `people-enrichment`, `ai-search`, `web-extraction`,
`twitter`, `youtube`, `tiktok`, `instagram` already exist).
