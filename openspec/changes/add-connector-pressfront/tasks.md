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
