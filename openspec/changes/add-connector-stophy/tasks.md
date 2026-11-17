# Tasks: add-connector-stophy

## 1. Connector

- [x] 1.1 `provider.ts`: bearer auth, `https://api.stophy.dev/v1`, one
      `default` pool, `consolidate` lifting `creditsUsed`, provider-level
      `fromError` (`$.error.message`)
- [x] 1.2 `schema/common.ts`: shared country, language, domain-list, time
      and cursor mirrors
- [x] 1.3 Eight endpoint defs with strict input mirrors; list endpoints
      bill only non-empty `results`; `google/search` COMPOSITE with pages
      read; "send one, not both" pairs enforced at the binding
- [x] 1.4 Fixtures recorded on the vendor's keyless tier (`record`
      pipeline with the auth header stripped, trimmed and scrubbed) + one
      recorded 401; provider-level shared chains with `{{request.url}}`;
      synthetic empty and pages-read chains
- [x] 1.5 Replay, estimate, schema-gate and gated-live tests per endpoint
- [x] 1.6 `deno task check && deno task test` pass with no network
