# Proposal: add-connector-tako

## Why

Tako (tako.com) searches a knowledge graph of licensed, structured data
and the live web in one call. A data result is a card: a chart or table
with its sources, a description, and rows a caller can fetch. Coverage
includes markets and company fundamentals, economic indicators, people
and companies, website traffic and SEO, sports, weather, and prediction
markets. No connector in the catalog searches structured statistics.

## What Changes

- **connectors/tako**: 2 synchronous endpoints, `X-API-Key` auth, base
  URL `https://tako.com/api`, 60 s timeouts (Tako's own server limit;
  a deep search's deadline is 30 s).
  - `tako#v3/search` (`POST /v3/search`): cards and web results.
  - `tako#v1/contents` (`POST /v1/contents`): a card's data rows, or a
    web page's extracted text.
- **Billing settles on Tako's own receipt.** Every metered Tako
  response carries `usage.total_cost_usd`, the full charge for the call.
  The provider's `usage.consolidate` plucks `usage` out of the output
  and claims that total in one pool, `default`, in US dollars.
- **Two lines on each paid endpoint.** `call` is `PER_CALL` at the
  endpoint's minimum charge: $0.007 for search, $0.001 for contents.
  `metered` is `PER_UNIT` `CREDIT` at $0.00001, the smallest unit Tako
  bills, and carries everything above the minimum. One provider-level
  `usage.evidence` sets `metered` from `usage.total_cost_usd` and reads
  both prices from the endpoint's `usage.model`, so the derived total
  equals the claim and the rate card has one source.
- **Every hold is an upper bound.** Tako prices some data per unit
  (website traffic and SEO cards) and prices card rows by source, so a
  call's cost isn't known before it runs. Each paid endpoint has a cost
  cap that Tako enforces, and the estimate holds the cap:
  - Search: `sources.data.max_variable_cost_usd`, defaulted to $0.25
    at the binding. Tako serves a card priced per unit only when its
    worst-case price fits in what's left of the cap, and returns a
    placeholder otherwise. The estimate also holds the $0.005 deep
    premium and, when `sources.data.include_contents` is true, the
    worst case for inlined rows: `sources.data.count` cards at $0.001
    each, plus `count × max_rows` rows, at most Tako's 2,000-row
    response budget plus a 20-row floor per card, at $1.60 per 1,000.
    Tako bills a card's rows at the sum of its paid feeds' rates, and
    $1.60 is the sum of all of them, the most Tako bills for one row.
    Inlined rows never bill premium rates.
  - Contents: `max_cost_usd`, required at the binding, at least the
    $0.001 base price. Tako prices the call before it reads any data
    and returns an unbilled 422 `COST_CAP_EXCEEDED` when the price is
    above the cap.
- **Binding changes from Tako's schema:**
  - Search: `effort` defaults to `fast` (Tako's default);
    `sources` defaults to `{data: {}, web: {}}`, which is what Tako
    searches when `sources` is omitted, so the data defaults apply;
    `sources.data.count` defaults to 5, `sources.data.include_contents`
    to `false`, and `sources.data.max_rows` to 20 (Tako's defaults for
    this account), so the estimate prices the values Tako uses;
    `sources.web.highlights` defaults to `true`. Tako's API defaults
    highlights to `false` for direct callers; for gateway users,
    highlights give better results, because the agent reads the
    snippet instead of fetching the page.
  - Search: `variable_cost` (both spellings) isn't exposed. Tako
    rejects it next to a cap, and the cap always has a value. A cap of
    0 pays nothing above the base price: Tako then serves data only for
    the per-unit cards whose minimum price the base price covers.
  - Search: `sources.data.mode` and `output_settings.force_refresh`
    aren't exposed. Tako documents both as having no effect.
  - Search: Tako rejects `sources: {}` with a 400. The rule spans two
    fields, so it's a note on the endpoint instead of a schema rule.
  - Contents: `mode` defaults to `inline`, so an agent gets
    the rows or page text in the response instead of a download link.
    Tako's API defaults to `url` for direct callers. A web page bills
    the same in either mode.
  - Contents: `quote_only` isn't exposed, and there's no quote
    endpoint. On `tako#v1/contents`, the engine drops a $0 claim and
    bills the `call` line, so a quote there wouldn't be free. A
    separate `FREE` endpoint is one more tool an agent has to find, and
    `max_cost_usd` already gives a free price check: over the cap, Tako
    returns an unbilled 422 with `quoted_cost_usd`.
  - `zdr` isn't exposed on any endpoint.
- **Category leaves.** `macro-data`, `weather`, and `sports` are new;
  no existing leaf covers them.

## Capabilities

- `tako-connector`.

## Non-goals

- `/v1/answer`, the agent run endpoints, the graph endpoints, and the
  enrichment endpoints.

## Impact

New connector tree and three category leaves. No schema or engine
contract change: `ENGINE_VERSION` unchanged, no new `Unit`, preset, or
hook.
