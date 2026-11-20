# Proposal: add-connector-drillr

## Why

drillr (drillr.ai, Little Grebe Inc.) is a financial data API for listed
companies in the US, mainland China and Japan: one REST surface over ticker
resolution, filings and filing-text search, the three financial statements,
precomputed ratios, the earnings calendar, news storylines, and for US
companies the 8-K event timeline and insider transactions. The catalog has an
`equities` leaf and nothing behind it that covers China and Japan in each
market's own filing system (SEC, cninfo, EDINET), with every row linked to its
source document.

It is a plain fit for the connector standard: one base URL, one `X-API-KEY`
header, synchronous calls, and a published flat per-call rate card in the
vendor's own credits. Nothing about it needs a new engine capability.

## What Changes

- **connectors/drillr** — 12 read-only endpoints against
  `https://gateway.drillr.ai/api/v2`, auth `presets.auth.header("X-API-KEY")`:
  - company: `GET /tickers`, `GET /company-discovery`
  - filings: `GET /filings`, `GET /filing-search`
  - news: `POST /news-search` (the one endpoint that takes a JSON body)
  - financials: `GET /income-statements`, `GET /balance-sheets`,
    `GET /cash-flow-statements`, `GET /financial-metrics-snapshot`
  - earnings: `GET /earnings-calendar`
  - US only: `GET /events`, `GET /insider-trades`
- **The pool is drillr credits, flat per call**, from the REST rate card on
  drillr.ai/docs/api (spec r116, read 2026-11-20): `/company-discovery` 3,
  `/news-search` 0.2, `/filing-search` 0.1, every other endpoint 0.02
  ("20 cr / thousand calls"; a multi-ticker request is one call). Twelve
  `PER_CALL` lines against one `default` pool.
- **The REST card is pinned, not the MCP card.** drillr publishes two cards
  that disagree for the same data: MCP `ticker_lookup` is free and
  `filing_list` is 0.1, while the REST pages for `/tickers` and `/filings`
  each state 20 cr / thousand calls. This connector calls REST.
- **No `usage.consolidate`.** A live probe found no usage or credit field in
  any response body and no usage header, so there is no vendor claim to lift.
  The pinned lines are the whole settle and the compiler synthesizes the
  empty quantities fns.
- **Faithful mirrors, no wire layer.** Each `schema/inputs.ts` mirrors the
  parameter table on its drillr.ai/docs/api page: optionality only, no
  defaults, `.strict()` (drillr itself answers 400 to an unknown parameter).
  drillr spells multi-value parameters as one comma-separated string, so
  they are strings; closed vocabularies (`market`, `period`, `event_class`,
  `record_type`, `form_type`, `transaction_type`) keep validation through a
  compiled `pattern`. No endpoint declares `input.toRequest` or
  `output.fromResponse`.
- **Agent-facing meta.** Provider `notes` carry what is true of every
  endpoint (canonical ticker form per market, resolve names with `/tickers`
  first, the error envelope, the rate limit); each endpoint states its own
  coverage limits and the parameter readings that are silently wrong
  (`from`/`to` on `/filing-search` filter the reporting period,
  on `/insider-trades` the filing date).
- **`/company-discovery` carries a 90 s request timeout**, the read timeout
  drillr documents for it (20 s to a minute per call).
- **Real recorded fixtures** for the happy path of all twelve endpoints and
  one real provider error (`/events` 404 for a Japan ticker); the remaining
  eleven provider-error fixtures are `synthetic-` and say so.

## Capabilities

- `drillr-connector`.

## Non-goals

- **Per-user state** — watchlists, bookmarks, research topics. Monid runs
  every caller on one platform credential, so these would be shared state.
- **The rest of the REST surface** — `company-profile`, `prices-historical`,
  `prices-snapshot`, `analyst-consensus`, `analyst-ratings`, `executives`,
  `executive-compensation`, `institutional-holdings`,
  `earnings-call-summary`, the typed `events-*` endpoints, and the two
  1-credit signal endpoints (`industry-inflections`,
  `enterprise-ai-adoption`). Recorded in tasks 6.1 for a follow-up change.
- **The MCP-only tools** — `run_sql`, `list_tables`, `get_table_schema` have
  no REST route.
- **No new category leaves.** `equities`, `company-enrichment`,
  `company-news`, `news-search` and `government-data` exist. The `events`
  leaf is concerts and conferences, not corporate events, and is not used.
- **No dollar conversion in the doc.** drillr's price per credit depends on
  the plan, so the pool is the vendor's own credits and conversion stays the
  broker card's job.

## Impact

New connector tree, twelve ids appended to `connectors/ids.lock.json`. No
`categories.ts` change, no engine bump, no new `Unit`, preset or hook.
