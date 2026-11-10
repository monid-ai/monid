# Proposal: add-connector-clawifi

## Why

[Clawifi](https://clawifi.dev) is a web-reading API for agents: search
through several engines, a page or PDF as markdown (optionally only the
passages that answer a question, with headings and offsets), a page
projected into chosen formats, and a site map from robots.txt, sitemaps,
feeds and links. It is priced in its own credits
([pricing.json](https://clawifi.dev/pricing.json), `credit_costs`) and,
since 1.7.5, reports what each call cost in the JSON body when asked to
(`X-Clawifi-Include-Credits: 1` → top-level `credits_charged`). Submitted
by the vendor (ReARC Labs Inc.).

## What Changes

- **connectors/clawifi** — provider (`presets.auth.bearer()` on
  `https://api.clawifi.dev`, static request header
  `X-Clawifi-Include-Credits: 1`) + 4 synchronous endpoints:
  `search/free`, `fetch`, `scrape`, `map`.
- **Billing** — one `default` pool ("Clawifi credits"). The provider
  `usage.consolidate` plucks `credits_charged` (the firecrawl pattern), so
  the vendor's own meter settles every run. Because the engine prunes a
  zero claim and falls back to the derived fold, endpoints whose answer can
  cost 0 (a cache hit) meter with PER_UNIT lines whose evidence reads the
  response, never a flat PER_CALL:
  - `search/free`: provider PER_CALL 1 (every 2xx search costs 1).
  - `fetch`: COMPOSITE `page` 1 + `browser_render` 2 + `pdf_page` 2 per
    started 50 pages (in place of `page`); a cache hit counts nothing.
  - `scrape`: COMPOSITE `page` 1 + `browser_render` 2; PDF not modeled
    (the response carries no page count; the claim settles it).
  - `map`: PER_UNIT RESULT, `every: 10`, evidence `max(1, urls)`;
    `max_urls` vendor default (100) materialized at the binding for the
    estimate.
- **Inputs** — non-strict mirrors of Clawifi's pydantic request models
  (OpenAPI snapshot `openapi-v1.json`, 1.7.5) with the vendor's own
  single-field bounds; `requires_auth` and `proxy_config` are not exposed
  on fetch/scrape and are stripped in `toRequest` (operator-only session
  state; caller proxy credentials). Cross-field rules live in `notes`.
- **Fixtures** — provider-level shared chains with `{{request.url}}`.
  `unauthorized.json` is recorded live (keyless 401, with
  `credits_charged: 0`). The happy chains are `synthetic-`: real response
  bodies from Clawifi's keyless playground (search, scrape, map) and the
  documented FetchEnvelope/PDF shapes (fetch), trimmed, with
  `credits_charged` added as Clawifi 1.7.5 returns it.
- **openspec/changes/add-connector-clawifi** — this proposal; no
  `design.md` (no schema/engine contract change, no new Units or
  categories).

## Capabilities

- `clawifi-connector`.

## Non-goals

- `POST /search` and `/search/web` (JSON array bodies: the body meter is
  only written into JSON objects).
- `/browse`, `/browse/cloud`, batch routes, `/crawl` and jobs (async or
  plan-gated), `/extract`, `/research*`, OSINT, monitors, account and
  billing routes.

## Impact

New connector tree plus four lines in `connectors/ids.lock.json`; no
schema/engine/compiler changes — version stays.
