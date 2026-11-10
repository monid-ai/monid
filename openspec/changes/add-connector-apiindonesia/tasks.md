# Tasks: add-connector-apiindonesia

## 1. Connector

- [x] 1.1 `provider.ts`: `x-api-key` header auth,
      `https://use.apiindonesia.id/api/v1`, one `default` credit pool,
      PER_CALL 2 inherited by every endpoint, provider-level `fromError`
      (`error.message` + `error.code`)
- [x] 1.2 19 endpoint defs with strict query/path mirrors of the vendor
      OpenAPI
- [x] 1.3 Real fixtures recorded with a vendor key (`deno task record`,
      trimmed): one happy chain per endpoint, 404s for `kbbi/word/{word}`
      and `sholat`, one 401; placeholder personas for natural persons
- [x] 1.4 Replay + schema-gate + gated-live tests per endpoint
- [x] 1.5 `deno task check && deno task test` pass with no network; live
      suite passes with `APIINDONESIA_API_KEY`
- [x] 1.6 `connectors/ids.lock.json`: the 19 `apiindonesia#` ids only
