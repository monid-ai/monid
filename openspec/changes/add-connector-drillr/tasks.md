# Tasks: add-connector-drillr

## 1. Drill the vendor surface

- [x] 1.1 Read drillr.ai/docs/api (spec r116), the MCP page, and the twelve
      endpoint pages; pin base url, the `X-API-KEY` header, the
      `{error, message}` envelope, the 100 requests / minute limit
- [x] 1.2 Pin the REST rate card: 3 / 0.2 / 0.1 / 0.02 credits per call; note
      where the MCP card disagrees (`ticker_lookup` free, `filing_list` 0.1)
- [x] 1.3 Probe one response live for a usage field or header — none, so no
      `usage.consolidate`
- [x] 1.4 Confirm the out-of-coverage answer live: `/events?ticker=7203.T`
      is 404 `not_found`

## 2. Provider

- [x] 2.1 `provider.ts`: meta + 5 notes, `X-API-KEY` header preset, the v2
      gateway, timeouts 60 s / 60 s, the credits pool
- [x] 2.2 `schema/common.ts`: `zDate`, `zEnumList`, `zTickers`, `zTicker`,
      `zPage`, `zRowLimit`, `statementQueryFields`

## 3. Endpoints (12)

- [x] 3.1 `tickers`, `company-discovery` (90 s timeout, 3 credits)
- [x] 3.2 `filings`, `filing-search` (0.1 credits)
- [x] 3.3 `news-search` — POST JSON body, 0.2 credits
- [x] 3.4 `income-statements`, `balance-sheets`, `cash-flow-statements` on
      the shared three-parameter fragment
- [x] 3.5 `financial-metrics-snapshot`, `earnings-calendar`
- [x] 3.6 `events`, `insider-trades` — US only

## 4. Fixtures + tests

- [x] 4.1 Record the happy path of all twelve endpoints via
      `deno task record` (14 live calls in total, one to
      `/company-discovery`); rewrite the descriptions; hand-minimize
      `news-search`
- [x] 4.2 One real provider error (`events/fixtures/provider-error.json`);
      eleven `synthetic-provider-error.json` shaped on it or on the
      documented 429 envelope
- [x] 4.3 Twelve `endpoint.test.ts`: recorded happy (status, usage, an output
      field), provider error (zero usage), live gated on `DRILLR_API_KEY`
- [x] 4.4 `provider.test.ts`: literal rate table whose key set equals the
      compiled ids; provenance (no consolidate, synthesized quantities, one
      inject fn, no `toRequest` / `fromResponse`)

## 5. Wiring + verify

- [x] 5.1 Append the twelve ids to `connectors/ids.lock.json`
- [x] 5.2 fmt · lint · check · test

## 6. Follow-ups (not in this change)

- [ ] 6.1 Scope the rest of the REST surface: `company-profile`,
      `prices-historical`, `prices-snapshot`, `analyst-consensus`,
      `analyst-ratings`, `executives`, `executive-compensation`,
      `institutional-holdings`, `earnings-call-summary`, the typed
      `events-*` endpoints, `industry-inflections` and
      `enterprise-ai-adoption` (1 credit each)
- [ ] 6.2 Replace the eleven `synthetic-provider-error.json` files with
      recordings; the 429 message text and the HTTP status of
      `insufficient_credits` are not documented
- [ ] 6.3 Confirm the 0.02 draw on `/tickers` and `/filings` against the
      account ledger — the REST and MCP cards disagree and no response
      carries a meter to check against
- [ ] 6.4 `deno task test:live` spends 3 credits on `/company-discovery`
      every run; decide whether that live test stays gated on the key alone
