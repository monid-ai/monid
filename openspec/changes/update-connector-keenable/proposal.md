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
- **Volume rate in USD (D9)** — pool label `US dollars`, draw `0.001`
  per successful search or fetch (Keenable's dedicated-capacity rate,
  $1 / 1,000 at 100+ RPS). Same posture as Exa. Empty `results: []`
  still bills 0. The Builder $0.004 rate is not used.

## Capabilities

- `keenable-connector`.

## Non-goals

- A Keenable-funded free allowance, or writing "free" in meta. The
  volume rate is pinned here; going fully FREE is still a hosted
  allowance question (and would down-weight each call to 0.2).
- An API-side `live: "auto"` or language-variant collapse — vendor
  changes. The fetch default is the connector interim; language
  variants stay a description caveat (`site` or a language word).
- Batch fetch (the vendor is one URL per call).
- SELECT / Web Query Language.

## Impact

Connector-only. No schema / engine / compiler contract change —
`ENGINE_VERSION` unchanged. `connectors/ids.lock.json` gains the five
new preset ids plus the two that PR #27 never locked.
