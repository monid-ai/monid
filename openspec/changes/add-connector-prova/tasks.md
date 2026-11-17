# Tasks: add-connector-prova

## 1. Drill the vendor surface

- [x] 1.1 Capture the published OpenAPI (`api.provaapi.com/openapi.json`):
      `POST /api/v1/funding-stages`, `LookupRequest`, the `found` /
      `not_found` / `pending` answers, bearer auth
- [x] 1.2 Pin the price: $0.01 per `found` answer; `not_found`, `pending`,
      and errors free
- [x] 1.3 Establish that no response carries a meter

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `https://api.provaapi.com/api/v1`
      baseUrl, timeouts (request 30 s, run 60 s, poll 3 s), the `default`
      pool in US dollars; no lifecycle

## 3. Endpoint (1)

- [x] 3.1 `funding-stages` — strict body mirror of `LookupRequest`
      (`view` limited to `full`) + lifecycle that re-posts on 202; a leaf
      `PER_UNIT`·`RESULT` at $0.01, evidence `status === "found"`

## 4. Tests

- [x] 4.1 Replay: found ($0.01), not_found (free), 202 then found (one
      charge), 422 (zero usage); live test gated on `PROVA_API_KEY`
- [x] 4.2 `connectors/ids.lock.json` gains `prova#funding-stages`
- [x] 4.3 `deno task check && deno task test` pass with no network; live
      run through `deno task engine:run` settles `found` at $0.01
