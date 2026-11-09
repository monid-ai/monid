# Tasks: add-connector-companyregistryapi

## 1. Drill the vendor surface

- [x] 1.1 Capture the published OpenAPI
      (`https://companyregistryapi.com/api/openapi.json`, read 2026-11-07);
      pin the base url, the keyless posture and every parameter
- [x] 1.2 Probe live: 200 search and profile, empty search, 400 expired
      cursor, 400 malformed id, 404 unknown id, unknown query keys ignored
      by the API

## 2. Provider + endpoints

- [x] 2.1 `provider.ts`: keyless auth, baseUrl, timeouts, FREE, meta and
      provider-wide notes (rate limit, problem documents, attribution,
      absent values)
- [x] 2.2 `search`: strict query-parameter mirror, paging and coverage
      notes
- [x] 2.3 `company`: strict path-parameter mirror, lifecycle and
      jurisdiction notes

## 3. Fixtures + tests

- [x] 3.1 Record five chains against the live API via `deno task record`;
      move them to provider-level fixtures with descriptions and
      `{{request.url}}` / `{{request.origin}}` bindings
- [x] 3.2 One synthetic 429 chain from the published OpenAPI example
- [x] 3.3 `provider.test.ts`: compiled-doc shape, six replays with zero
      usage, both input gates, and a live search-then-read test that runs
      under `deno task test:live` (needs only the network)
- [x] 3.4 `deno task test:live` for this provider green, keyless

## 4. Wiring + verification

- [x] 4.1 `connectors/ids.lock.json`: add the two identities (the lock's
      unrelated existing drift is left alone)
- [x] 4.2 Verify: lint · check · test · double-compile `--force
      --frozen-meta` byte-identical · `version:check` clean · catalog
      inspect
- [x] 4.3 `deno fmt --check` reports two pre-existing workflow files
      (`ci.yml`, `publish-catalog.yml`); neither is touched by this change
