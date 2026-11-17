# Tasks: add-connector-pressfront

## 1. Vendor surface

- [x] 1.1 Pin base url, bearer auth, the four operations and their schemas
      from the published OpenAPI (`https://pressfront.co/api/v1/openapi.json`)
- [x] 1.2 Verify the job protocol live: `POST /traces` 202 `{id, etaSec}`,
      `GET /traces/{id}?wait=25` long-polls, status
      `queued | running → done | thin | failed`, story and brief readable on
      done (2026-11-05, a real trace finished in 3 min 36 s)
- [x] 1.3 Verify the 404 `no_recent_trace` of the instant check live

## 2. Connector

- [x] 2.1 Provider: identity, auth, `default` pool in US dollars, fromError
- [x] 2.2 `instant/{handle}` PER_CALL 0.49
- [x] 2.3 `traces` async lifecycle (start / poll, no stop) PER_CALL 4.99
- [x] 2.4 `traces/{id}` FREE, `traces/{id}/{part}` PER_CALL 0.05

## 3. Tests and record

- [x] 3.1 Real demo-key recordings (invented trace) + two synthetic chains
- [x] 3.2 Replay tests: answered, searched then answered, zero-billed 404,
      done, failed, read, free status; live instant test with the demo key
- [x] 3.3 `ids.lock.json` updated (`deno task ids:check --update`)

## 4. Stories, plain words, the case card (2026-11-06)

- [x] 4.1 `pressfront#traces` takes exactly one of name / claim / text
      (+ files); settles `case`; skips `story` on a story trace
- [x] 4.2 `pressfront#understand` PER_CALL 0.05 (sync)
- [x] 4.3 `case` added to `pressfront#traces/{id}/{part}`
- [x] 4.4 Fixtures from Pressfront's own API code (case-target, case-rumor,
      understand-ok, understand-unclear, synthetic-trace-rumor-done); replay
      tests: name done with case, text story done, exactly-one gate, both
      case reads, understood, zero-billed unclear, text required
- [x] 4.5 `ids.lock.json` gains `pressfront#understand`
- [ ] 4.6 Re-record `case-target` with the demo key once `/case` is live
