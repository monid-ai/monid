# Tasks: add-connector-salesbook

## 1. Provider

- [x] 1.1 provider.ts: baseUrl, keyless auth (empty credentials + identity
      inject), timeouts 15/20 s, FREE model, meta + notes
- [x] 1.2 schema/common.ts: the six-sector enum

## 2. Endpoints (5)

- [x] 2.1 search_startups, get_profile, get_ranking, find_alternatives,
      compare_vendors: faithful mirror per endpoint, vendor bounds at the
      binding, identity = wire path
- [x] 2.2 ids.lock.json: the five ids (only these; the lock's other
      pre-existing drift is left alone)

## 3. Fixtures + tests

- [x] 3.1 Eleven recorded fixtures (2026-10-22, public data), three
      synthetic error shapes, each file says which it is
- [x] 3.2 provider.test.ts: compiled shape (5 ids, urls, keyless, FREE,
      nothing mapped), recorded happy replays equal the body, sources and
      dates survive, empty answers, 400/429/503/500 as zero-billed data,
      binding gates with no upstream call, bare egress, request timeout,
      fixture size, live run gated on `SALESBOOK_LIVE=1`

## 4. Verify

- [x] 4.1 fmt · lint · check · test · double-compile · version:check ·
      catalog endpoints (5) · live run against the public API
