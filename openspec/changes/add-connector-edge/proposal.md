# Proposal: add-connector-edge

## Why

Edge (getedge.cc) finds the best expert skill for the task an agent is
about to do and loads it for that task. It searches about 130,000 public
agent skills (SKILL.md packages on GitHub), ranks them for the exact
task, and returns only skills whose exact bundle passed its automated
security checks. In the catalog, a `discover` query like "how do I write a
cold email sequence" or "expert workflow for a postgres migration" then
has an answer: the skill to follow. Two synchronous JSON endpoints, free,
no new engine capability.

## What Changes

- **connectors/edge**: 2 endpoints, `Authorization: Bearer` auth,
  60 s timeouts, FREE model (both endpoints are $0, OpenAPI `x-price`):
  - `edge#find_skill` (`POST /api/v1/find_skill`): `query` (3-500
    characters), optional `keywords` and `limit` (1-5). Returns
    `request_id`, up to 5 skills (`source`, `skill`, `description`,
    `fit_score`, `recommended`, `security_state`, `installs`, `url`) and a
    `recommendation` (`pick` / `shortlist` / `none` / `routine`).
  - `edge#use_skill` (`POST /api/v1/use_skill`): `skill` required,
    optional `source`, `request_id`, `version`. Returns the skill's
    SKILL.md and supporting files as `instructions`. 403 blocked, 404 not
    loadable, 409 review still running (Retry-After): all data, zero
    usage.
- **New category leaf** `agent-skills` ("Agent Skills") in
  `connectors/categories.ts`: no existing leaf names skill search; the
  closest, `agents`, is hosted research agents.
- Fixtures: all three RECORDED against https://getedge.cc on 2026-11-03
  (find happy, use happy, use 404) with `deno task record`, trimmed,
  moved into provider-level shared chains.

## Capabilities

- `edge-connector`.

## Non-goals

- Edge's MCP server (`/mcp`, JSON-RPC over Streamable HTTP) and its
  MCP-only tools (`rate_skill`, account tools). The JSON API at
  `/api/v1` is the same search, ranking, security gate and loader, built
  for gateways.

## Impact

New connector tree plus one category leaf. No schema/engine contract
change: `ENGINE_VERSION` unchanged, no new `Unit`, preset or hook.
