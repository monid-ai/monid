# Tasks: add-connector-datalegion

## 1. Drill the vendor surface

- [x] 1.1 Capture the OpenAPI (`docs/api-reference/openapi.json`) for
      `/person/enrich` and `/company/enrich`
- [x] 1.2 Pin the billing basis from datalegion.ai/pricing: 1 credit per
      returned record, separate person and company credits, no-match free
- [x] 1.3 Take the Base / Premium / PII field split from the tier docs

## 2. Connector

- [x] 2.1 `provider.ts`: base URL, `API-Key`, timeouts, two pools, shared
      estimate and evidence
- [x] 2.2 Body schemas (`schema/person.ts`, `schema/company.ts`)
- [x] 2.3 Six product endpoints with request and response field filters

## 3. Identity and tests

- [x] 3.1 Add the 6 ids to `connectors/ids.lock.json`
- [x] 3.2 Synthetic fixtures + `connector.test.ts` (each product's filter,
      no-match, the `exclude_fields` merge)
- [x] 3.3 `deno task check && deno task test`

## 4. Follow-ups

- [ ] 4.1 Record real fixtures with a Data Legion key (`deno task record`)
- [ ] 4.2 Confirm against a live response whether `exclude_fields` accepts
      nested paths; if so, move the nested Premium exclusions to the request
