# Tasks: update-connector-keenable

## 1. Meta + categories

- [x] 1.1 provider.ts: summary/description; categories
      `web-search`, `news-search`, `web-scraping`
- [x] 1.2 search: displayName "Keenable Web Search"; news-capable
      description; categories `web-search` + `news-search`
- [x] 1.3 fetch: live-fallback description; categories
      `web-scraping` + `web-extraction`

## 2. Live-fallback fetch + input hygiene

- [x] 2.1 fetch `live` default true at the binding (D6); `live: false`
      remains valid
- [x] 2.2 `/\S/` on query, site, date bounds, query_time, prompt (D8)
- [x] 2.3 query_time formats documented (YYYY-MM-DD, ISO 8601,
      relative delta, Unix epoch as a string)

## 3. Job-shaped presets

- [x] 3.1 `keenable#v1/search-news`: pin `/v1/search-news`, POST
      `/v1/search`, `published_after` default `2d`
- [x] 3.2 `keenable#v1/search-as-of`: pin `/v1/search-as-of`,
      `query_time` required
- [x] 3.3 `keenable#v1/fetch-answer`: pin `/v1/fetch-answer`, GET
      `/v1/fetch`, `prompt` required
- [x] 3.4 Shared search binding + usage interned across the three
      search docs

## 4. Fixtures + tests

- [x] 4.1 Update fetch fixtures for the `live=true` default; add
      indexed-only, not-in-index, news, as-of, and fetch-answer
      synthetics
- [x] 4.2 Tests: meta/categories, whitespace rejection, default-live
      fallback, indexed opt-out, news preset, required query_time /
      prompt, existing happy / 401 / empty-search / bound twins

## 4b. Volume rate (D9)

- [x] 4b.1 Provider pool label `US dollars`; PER_CALL / PER_UNIT
      draw `0.001` (dedicated-capacity rate)
- [x] 4b.2 Tests expect `{credits: {default: 0.001}}`; empty search
      still bills 0

## 5. Wiring + docs

- [x] 5.1 OpenSpec proposal / design / spec
- [x] 5.2 `connectors/ids.lock.json` gains the keenable ids
- [x] 5.3 Verify: fmt · lint · check · keenable tests

## 6. Beat Exa on discover jobs (D10)

- [x] 6.1 `keenable#v1/search-contents`: pin `/v1/search-contents`,
      `snippet_max_length` default 10000, `web-search` +
      `web-extraction`
- [x] 6.2 `keenable#v1/search-papers`: pin `/v1/search-papers`,
      `snippet_max_length` default 10000, `academic-search`
- [x] 6.3 Provider + search + fetch copy names search-and-read /
      live-web context; provider gains `academic-search`
- [x] 6.4 Fixtures, tests, ids.lock, OpenSpec D10
