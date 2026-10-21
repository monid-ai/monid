# Proposal: add-connector-hirehouse

## Why

HireHouse (hirehouse.xyz) is an AI hiring platform for startups and recruiting
agencies, mostly in India, the UAE and the GCC. Its public jobs API exposes the
active, reviewed listings hiring through it: a `jobs` source next to the
existing job boards, free and keyless. Three synchronous GETs, no new engine
capability. Published surface: `https://hirehouse.xyz/api/public`
(OpenAPI 3.1 at `/api/public/openapi.json`, docs at `/developers`).

## What Changes

- **connectors/hirehouse** — 3 endpoints, category `jobs`, 30 s timeouts:
  - `hirehouse#jobs/search` (`GET /jobs/search`): every word of `query` must
    match; `location`, `workMode` (remote/onsite/hybrid), `limit` (1–50),
    opaque `cursor`. No exact match returns related roles with
    `match: "related"` and a per-job `relatedReason`.
  - `hirehouse#jobs/{id}` (`GET /jobs/{id}`): one job with its full
    Markdown description (`requirements`).
  - `hirehouse#jobs/compare` (`GET /jobs/compare`): 2–5 comma-separated ids;
    non-public ids come back in `missing`.
- **FREE** on every endpoint: HireHouse charges nothing per call, so no
  credit pool and no `usage.consolidate`.
- **Auth**: none required. The vendor's optional free key (`X-HireHouse-Key`)
  only raises the rate limit (60 → 600 requests/min), so
  `auth.credentials` is `{apiKey?}` and `auth.inject` adds the header only
  when a key is set.
- **Attribution**: a static `X-HireHouse-Source: monid` request header; the
  vendor tags the returned `applyUrl`s with `utm_source=monid`.
- Fixtures: `synthetic-` happy and error chains shaped from the published
  OpenAPI spec (the API was not live when the connector was written).

## Capabilities

- `hirehouse-connector`.

## Non-goals

- Applying to jobs: callers send candidates to each job's `applyUrl`.
- HireHouse's MCP server (`/mcp`), which covers the same data for MCP hosts.

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION`
unchanged, no new `Unit`, no new preset, no new hook, no new category leaf
(`jobs` already exists). The optional-credential auth shape is expressible
with existing `auth.credentials` + an ad-hoc `auth.inject`, so no `design.md`.
