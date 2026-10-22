# Tasks: add-connector-censusdataxyz

## 1. Port

- [x] 1.1 Read monid-services `adaptors/census` and censusdata.xyz/skill
- [x] 1.2 `provider.ts`: base URL, `X-API-Key`, 30 s timeouts, FREE usage,
      top-level `quota` pluck
- [x] 1.3 `query` and `explore-variables` endpoints with strict schemas

## 2. Identity and tests

- [x] 2.1 Add `censusdataxyz#query` and `censusdataxyz#explore-variables` to
      `connectors/ids.lock.json`
- [x] 2.2 Synthetic fixtures + `connector.test.ts` (happy, unanswerable,
      429, explore)
- [x] 2.3 `deno task check && deno task test`

## 3. Follow-ups

- [ ] 3.1 Record real fixtures with a censusdata.xyz key (`deno task record`)
