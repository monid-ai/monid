# Tasks for add-connector-xquik

## 1. Provider and schemas

- [x] 1.1 provider.ts sets `x-api-key` auth, the base URL, 120 s timeouts
      and one `default` pool in US dollars, with no consolidate
- [x] 1.2 schema/common.ts holds the user ID, cursor, fields, omit, the
      tweet filters and the profile filters the list reads share

## 2. Endpoints (7)

- [x] 2.1 tweets-search, GET /x/tweets/search, PER_UNIT `RESULT`
      $0.00015, `limit` default 20
- [x] 2.2 tweet, GET /x/tweets/{id}, PER_CALL $0.00015
- [x] 2.3 users-search, GET /x/users/search, PER_UNIT `RESULT` $0.00015,
      `pageSize` default 20
- [x] 2.4 user, GET /x/users/{id}, PER_CALL $0.00015
- [x] 2.5 user-tweets, GET /x/users/{id}/tweets, PER_UNIT `RESULT`
      $0.00015, `pageSize` default 20
- [x] 2.6 user-followers and user-following, GET /x/users/{id}/followers
      and /following, PER_UNIT `RESULT` $0.00015, `pageSize` default 200

## 3. Fixtures and tests

- [x] 3.1 Recorded happy fixtures at 2 rows or fewer, and recorded errors
      for 400 missing_query, 401 unauthenticated, 404 user_not_found and
      404 for a missing tweet
- [x] 3.2 Each endpoint tests its happy usage per returned row, an error
      that bills 0, a schema gate with a passing near-twin and a live call
      gated on XQUIK_API_KEY
- [x] 3.3 provider.test.ts pins a literal rate table, checks each happy
      output is Xquik's body unchanged and checks fn provenance
- [x] 3.4 Strict query schemas refuse filters Xquik prices above the read
      price, and the lookups refuse IDs that would route to other reads

## 4. Wiring and docs

- [x] 4.1 OpenSpec proposal and spec
- [x] 4.2 ids.lock.json updated
- [x] 4.3 check, test, lint, fmt, ids:check and `engine:run` pass on each
      endpoint
