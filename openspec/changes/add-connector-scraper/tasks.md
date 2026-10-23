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
      `indeed/companies`, COMPOSITE for `naukri/jobs`; identifier unions and
      URL patterns; cross-field rules in `meta.notes`; `.describe()` before
      `.optional()`
- [x] 1.4 Real fixtures recorded with a vendor key (`deno task record`,
      trimmed) + one recorded 401; free text, people, and review ids in the
      LinkedIn post and Glassdoor review, interview, benefits, and profile
      recordings replaced with placeholders;
      provider-level shared chains with `{{request.url}}`
- [x] 1.5 One provider-level rate table (a literal row per endpoint), the
      Naukri `fetchDetails` and Indeed block-rate estimate checks, a 401
      check, strict-body gates, a table of identifier forms and near
      misses, and a gated live test that asserts shape, not amounts
- [x] 1.6 `connectors/ids.lock.json`: 17 new ids
- [x] 1.7 `deno task check && deno task test` pass with no network
