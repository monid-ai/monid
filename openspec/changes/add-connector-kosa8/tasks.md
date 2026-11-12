# Tasks: add-connector-kosa8

## 1. Provider, schemas, resource

- [x] 1.1 provider.ts: bearer auth, baseUrl, 45 s / 60 s, `cost_usd` strip
- [x] 1.2 schema/common.ts: sandbox id, path params, template and region keys
- [x] 1.3 resources/sandbox: data, rate card (3 estimated lines),
      reconcileUsage meters, verify, release

## 2. Endpoints (7)

- [x] 2.1 create-sandbox (provisions, `ttl_s` required ≤ 28 days)
- [x] 2.2 exec (uses, buffered)
- [x] 2.3 get-sandbox (reads), sleep-sandbox / wake-sandbox (uses)
- [x] 2.4 delete-sandbox (releases, upstream DELETE)
- [x] 2.5 list-templates
- [x] 2.6 `code-execution` category leaf

## 3. Fixtures + tests

- [x] 3.1 Synthetic fixtures built from the worker source
- [x] 3.2 Endpoint tests: seed, ownership 404s, refusals as data, input
      gates, release and reconcile marks
- [x] 3.3 Resource tests: verify / release, meter formula, deleted-sandbox
      fallback, unreadable meter throws
- [ ] 3.4 Record real fixtures once Monid holds a kosa8 organization key
