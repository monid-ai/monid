# Tasks: add-connector-twittrapi

## 1. Connector

- [x] 1.1 `provider.ts`: `X-API-KEY` header auth, `https://api.twittrapi.com`,
      pinned `User-Agent` / `Accept`, the `format=simple` / CSV / JSON wire
      profile, `fromError`, the USD pool and the one PER_UNIT·PAGE card
      (0|1 evidence, one-page estimate)
- [x] 1.2 `schema/common.ts`: shared path/query fragments (tweet id, handle,
      user id, count, cursor, list id, empty strict query)
- [x] 1.3 18 endpoint defs + strict input mirrors; two `endpoint:` pins for
      the camelCase wire segments
- [x] 1.4 Real fixtures recorded with a vendor key (`deno task record`,
      trimmed): one happy page per endpoint, filters search, empty / null
      successes, a 401 and a 422; third-party individuals pseudonymized
- [x] 1.5 `provider.test.ts`: literal rate table, uniformity, replay per
      endpoint, wire profile, empty and error settles, estimates, strictness
      and pattern gates, one gated live case
- [x] 1.6 `connectors/ids.lock.json`: the 18 ids
- [x] 1.7 `deno task check && deno task test` pass with no network
