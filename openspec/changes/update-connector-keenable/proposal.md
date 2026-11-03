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
- **Live-fallback fetch (D6)** — `live` defaults to `true` at the
  binding. Indexed and live cost the same credit (D4), so there is no
  cost reason to make a miss an error. Callers set `live: false` for
  the indexed copy only. The vendor API has no `live: "auto"` (boolean
  only, docs 2026-11-03); the connector default is the interim.
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
- Billing unchanged: search (and its presets) PER_UNIT RESULT, empty
  `results: []` bills 0; fetch (and fetch-answer) inherit PER_CALL 1.

## Capabilities

- `keenable-connector`.

## Non-goals

- Hosted price, a Keenable-funded free allowance, or writing "free" in
  meta (the Monid wallet price is not this repo).
- An API-side `live: "auto"` or language-variant collapse — vendor
  changes. The fetch default is the connector interim; language
  variants stay a description caveat (`site` or a language word).
- Batch fetch (the vendor is one URL per call).
- SELECT / Web Query Language.

## Impact

Connector-only. No schema / engine / compiler contract change —
`ENGINE_VERSION` unchanged. `connectors/ids.lock.json` gains the three
new ids plus the two that PR #27 never locked.
