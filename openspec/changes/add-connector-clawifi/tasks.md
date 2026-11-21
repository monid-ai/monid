# Tasks: add-connector-clawifi

## 1. Connector

- [x] 1.1 `provider.ts`: bearer auth, `https://api.clawifi.dev`, static
      `X-Clawifi-Include-Credits: 1` header, credits pool, `consolidate`
      plucking `credits_charged`, provider-level `fromError`
- [x] 1.2 `schema/common.ts`: fields shared by fetch, scrape and map
- [x] 1.3 Four endpoint defs + per-endpoint input mirrors; metered lines
      for fetch/scrape/map so a cache hit derives 0; 120 s provider timeout
- [x] 1.4 One live-recorded 401 (no key) + synthetic happy chains built
      from keyless playground bodies and documented shapes, provider-level
      with `{{request.url}}`
- [x] 1.5 Replay + estimate + schema-gate + gated-live tests per endpoint;
      provider test for the header, shared fns and the strip on the wire
- [x] 1.6 `deno task check && deno task test` pass with no network
- [ ] 1.7 Re-record the synthetic chains with `deno task record` and a
      Clawifi test key (offered to maintainers)
