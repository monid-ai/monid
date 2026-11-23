# Proposal: update-connector-keenable

## Why

On Monid, agents discover Keenable next to a free search (TinyFish) and
priced alternatives whose copy already names a next step, a news
category, and a fetch that never fails just because a URL is missing
from an index. Keenable's catalog meta still said "Search" / "Fetch a
URL as clean, LLM-ready markdown" and fetch defaulted to indexed-only —
a non-indexed URL was a provider error. That is the agent-visible half
of why Keenable sits at #28. Price is a hosted commercial question;
this change ships the connector half.

## What Changes

- **Agent-facing meta** — provider, search and fetch summaries /
  descriptions rewritten the way discover ranks: what it does, what it
  will not do, and which endpoint to reach for next. Search
  `displayName` is "Keenable Web Search" (the hosted label had drifted
  to "Search Web Pages"). Categories: provider
  `web-search` + `news-search` + `web-scraping`; search
  `web-search` + `news-search`; fetch `web-scraping` + `web-extraction`.
  Provider also lists `academic-search`. Copy names the one-call
  extract path so discover can rank Keenable for the job Exa
  currently owns.
- **Live-fallback fetch (D6, revised 2026-11-07)** — the API now
  serves the indexed copy and reads an unindexed URL live when `live`
  is omitted, so the binding keeps the vendor default instead of
  forcing `live: true`. A miss is not a provider error, and indexed
  pages stay fast. `live: true` forces a fresh read.
- **Input hygiene (D8)** — whitespace-only `query` / `site` / date
  bounds / `prompt` fail INVALID_INPUT via `/\S/` (a zod `.trim()` does
  not survive `z.toJSONSchema`). `query_time` formats documented
  (YYYY-MM-DD, ISO 8601, relative delta, Unix epoch as a string).
- **Job-shaped presets** — three docs that share the vendor paths
  (D22 identity pin, opoint posture):
  - `keenable#v1/search-news` — `published_after` defaults to `2d`,
    `news-search`.
  - `keenable#v1/search-as-of` — `query_time` required, point-in-time
    search.
  - `keenable#v1/fetch-answer` — `prompt` required, `web-extraction`.
  - `keenable#v1/search-contents` — `snippet_max_length` defaults to
    `10000`, `web-search` + `web-extraction` (search-and-read).
  - `keenable#v1/search-papers` — `snippet_max_length` defaults to
    `10000`, `academic-search`.
- **Prices in USD, as hosted (D9, revised 2026-11-16)** — pool label
  `US dollars`, the Exa posture. The search docs draw `0.004` per
  search with results and the fetch docs `0.001` per page: the prices
  Monid charges for Keenable today. Empty `results: []` still bills 0.
- **Hosted parity (D11)** — the connector follows the hosted
  `monid-services` adaptor wherever a buyer could tell them apart:
  - Keenable's per-call `usage` receipt (on 2xx bodies since
    2026-11-12) is removed from the output by a provider
    `usage.consolidate` that makes no claim, so the derived fold still
    settles.
  - Every call sends `X-Keenable-Title: Monid`, the attribution header
    Keenable asked for.

## Capabilities

- `keenable-connector`.

## Non-goals

- A Keenable-funded free allowance, or writing "free" in meta. The
  hosted Keenable Free promotion and its per-workspace rate limits are
  hosted offers, not vendor endpoints, and stay out of the connector
  (D11). Going fully FREE would also down-weight each call to 0.2.
- An API-side `live: "auto"` or language-variant collapse — vendor
  changes. The fetch default is the connector interim; language
  variants stay a description caveat (`site` or a language word).
- Batch fetch (the vendor is one URL per call).
- SELECT / Web Query Language.

## Impact

Connector-only. No schema / engine / compiler contract change —
`ENGINE_VERSION` unchanged. `connectors/ids.lock.json` gains the five
new preset ids plus the two that PR #27 never locked.

The Keenable listing Monid serves today still comes from the hosted
`monid-services` adaptor, so its price and behavior are set there;
this change keeps the connector in step with it (D11).
