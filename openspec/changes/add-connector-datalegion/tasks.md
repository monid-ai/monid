# Tasks: add-connector-datalegion

## 1. Read the v1 adaptor and the vendor surface

- [x] 1.1 v1 `adaptors/datalegion`: six keys, six per-call rates, unchanged
      body, identifier rules, 30 s / 30 s (endpointExecution config)
- [x] 1.2 Capture the OpenAPI (`docs/api-reference/openapi.json`) for
      `/person/enrich` and `/company/enrich`: request bodies, the
      `matches[].{person|company, match_metadata}` response, 404 no-match

## 2. Connector

- [x] 2.1 `schema/auth.ts`: the six-key credential shape
- [x] 2.2 `provider.ts`: base URL, timeouts, six pools, provider notes
- [x] 2.3 Body schemas (`schema/person.ts`, `schema/company.ts`)
- [x] 2.4 Six endpoints, each with its own key inject and pool

## 3. Identity and tests

- [x] 3.1 Add the 6 ids to `connectors/ids.lock.json`
- [x] 3.2 Synthetic fixtures + one `endpoint.test.ts` per endpoint (happy,
      404, schema gate, live) + `provider.test.ts` (key per product, rate
      literals)
- [x] 3.3 `deno task check && deno task test`

## 4. Follow-ups

- [ ] 4.1 Record real fixtures with the six keys (`deno task record`)
