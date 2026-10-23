# Tasks: add-connector-scraper

## 1. Connector

- [x] 1.1 `provider.ts`: bearer auth, `https://scraper.run/api/v1/tools`,
      credit pool, `usage.consolidate` for `meta.creditsUsed`, provider-level
      `fromError` (`message` → `code`), 120 s timeouts (every call scrapes
      the source site live)
- [x] 1.2 `schema/common.ts`, `schema/linkedin.ts`, `schema/glassdoor.ts`:
      shared constants and shared body shapes
- [x] 1.3 Seventeen endpoint defs + per-endpoint strict input schemas;
      leaf `PER_CALL` for fifteen, leaf `PER_UNIT` block rate for
      `indeed/companies`, COMPOSITE for `naukri/jobs`
- [x] 1.4 Real fixtures recorded with a vendor key (`deno task record`,
      trimmed) + one recorded 401; free text and people in the LinkedIn
      post and Glassdoor review recordings replaced with placeholders;
      provider-level shared chains with `{{request.url}}`
- [x] 1.5 One provider-level rate table (a literal row per endpoint), the
      Naukri `fetchDetails` and Indeed block-rate estimate checks, a 401
      check, strict-body and one-identifier gates, and a gated live test
- [x] 1.6 `connectors/ids.lock.json`: 17 new ids
- [x] 1.7 `deno task check && deno task test` pass with no network
