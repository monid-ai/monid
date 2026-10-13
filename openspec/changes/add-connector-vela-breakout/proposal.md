# Proposal: add-connector-vela-breakout

## Why

Vela Breakout (breakout.vela.partners, by Vela Partners) answers a question
no connector in the catalog answers: what is growing in tech, and how fast
against its peers. It measures AI apps and models, open models, agent tools
and skills, editor and browser extensions, workplace add-ons, developer
packages, business software adoption, web technologies, hiring, news and AI
research ideas daily, and returns every figure in words with its unit,
window, caveat, peer percentile and chart link. Its HTTP API is a clean fit
for the connector standard — one base URL, bearer auth, five synchronous
JSON GETs, a flat published price — so nothing about it needs a new engine
capability.

## What Changes

- **connectors/vela-breakout** — 5 endpoints against
  `https://breakout.vela.partners/api/v1`, bearer auth, 30 s / 30 s:
  - `vela-breakout#groups` (`GET /groups`): every rankable group with id,
    signal, meaning, unit, caveat and usual window. FREE.
  - `vela-breakout#breakouts` (`GET /breakouts`): the fastest growers in
    one group; `group` required (closed enum of the 16 ids `/groups`
    returns), optional `window_days` (7/30/90/365), `limit` (1-25),
    `min_size` (median/p75/none), `steady`.
  - `vela-breakout#company` (`GET /company`): every signal for one company
    by name or domain (2-120 characters); an unknown company is a 404.
  - `vela-breakout#ideas` (`GET /ideas`): AI research ideas by change in
    share of new papers; `direction` required (rising/fading), `limit`.
  - `vela-breakout#rising-companies` (`GET /rising-companies`): companies
    rising on two or more measures; `limit`.
- **Faithful mirrors, no wire layer.** Each `schema/inputs.ts` mirrors the
  published OpenAPI parameters (optionality only, `.strict()`); the shared
  `limit` fragment lives in `schema/common.ts`. No `input.toRequest`.
- **One dollar pool.** Breakout meters one prepaid dollar balance and
  publishes its price in dollars, so the pool `default` is "US dollars"
  (the exa / minimax / dataforseo posture). The provider declares
  `PER_CALL` 0.02 (a ranked list); `/company` overrides it with `PER_CALL`
  0.01 (one lookup) and `/groups` with `FREE`. Only HTTP 200 is
  charged upstream, which is exactly the engine's zero-billed non-2xx rule.
- **No `usage.consolidate`.** No Breakout response carries a cost or credit
  field, so the derived fold settles (design D27; the tinyfish / clay /
  keenable posture).
- **New category leaf `market-trends`** ("Tech & Market Trends"): no existing
  leaf names growth and adoption tracking. `/company` and
  `/rising-companies` also carry `company-enrichment`.
- **Fixtures**: seven provider-level `synthetic-` chains. Bodies are real
  Breakout API responses captured 2026-10-12 by hand and trimmed (the API
  was not yet reachable for `deno task record`); the 401 chain binds
  `{{request.url}}` so it serves any parameterless call.

## Capabilities

- `vela-breakout-connector`.

## Non-goals

- `POST /ask` is not ported. Its price is the language model's cost plus a
  margin and varies per question, and no response field reports it, so
  neither a flat card nor a consolidate could bill it honestly. It should
  arrive with its own change once Breakout reports a per-call meter.

## Impact

New connector tree, five new ids in `connectors/ids.lock.json`, one new
category leaf in `connectors/categories.ts`. No schema or engine contract
change — `ENGINE_VERSION` unchanged, no new `Unit`, preset or hook.
