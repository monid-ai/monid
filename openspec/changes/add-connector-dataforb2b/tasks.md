# Tasks: add-connector-dataforb2b

## 1. Drill the vendor surface

- [x] 1.1 Capture the public reference for `POST /search/people`,
      `POST /search/companies` and `POST /enrich/profile`
      (docs.dataforb2b.ai, 2026-09-23)
- [x] 1.2 Pin the published card: 1.5 per live result, 0.75 per indexed
      result; profile 1.5, work email 1, personal email 3, phone 10, each
      only when found; GitHub free
- [x] 1.3 Confirm `credits_used` on every successful response, the `api_key`
      header, FastAPI `{detail}` errors, and the per-route `enrich_live`
      server defaults (people true, companies false)

## 2. Provider

- [x] 2.1 `provider.ts`: header auth, baseUrl, timeouts, the `default` pool,
      the `credits_used` consolidate, `output.fromError` over `{detail}`
- [x] 2.2 `schema/filters.ts`: the shared filter grammar and search body

## 3. Endpoints (3)

- [x] 3.1 `search-people` — `count` required, `enrich_live` default true,
      composite live/indexed per-result lines
- [x] 3.2 `search-companies` — same grammar, `enrich_live` default false
- [x] 3.3 `enrich-profile` — one arm per `enrich_*` flag, composite
      per-item lines counted when non-null

## 4. Verification

- [x] 4.1 6 provider-level chains recorded live (`deno task record`) and
      hand-minimized, 13 replay tests, 3 live tests gated on
      `DATAFORB2B_API_KEY` (green live, 2026-09-23)
- [x] 4.2 `deno task check && deno task test` green with no network
- [x] 4.3 Three ids added to `connectors/ids.lock.json`
