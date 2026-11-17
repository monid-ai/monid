# Tasks: add-connector-telnyx

## 1. Connector

- [x] 1.1 `provider.ts`: bearer auth, `https://api.telnyx.com/v2`, 30 s
      timeouts, one `default` US-dollar pool, no consolidate; price source
      and check date in the header comment
- [x] 1.2 `web-search` endpoint: strict faithful body mirror, no defaults;
      PER_UNIT `RESULT` $0.005, estimate 1, evidence 1 for a non-empty
      `data.results.web` and 0 for an empty one (strict `utils.json.len`)
- [x] 1.3 `connectors/ids.lock.json`: add `telnyx#web_search`

## 2. Fixtures + tests

- [x] 2.1 Recorded fixtures via the native transport (happy, omitted
      count, empty, 400, 401), trimmed and scrubbed; one `synthetic-`
      null-optional-fields fixture
- [x] 2.2 Tests: compiled surface + rate, happy (whole usage, raw output),
      empty bills 0, provider errors (zero usage), schema gate with passing
      near-twins, estimate independent of count, malformed 2xx fails
      closed, live gated on `liveSkip("telnyx")`
- [x] 2.3 `deno task check && deno task test` pass with no network

## 3. Follow-up

- [ ] 3.1 Re-audit the card if Telnyx publishes a separate livecrawl price
