# Tasks: add-akta-endpoints

## 1. Drill the vendor surface

- [x] 1.1 Diff the hosted catalog (`api.monid.ai/public/v1/providers/akta`,
      20 endpoints) against this repo (6)
- [x] 1.2 Capture the published OpenAPI (`agent-docs.akta.pro/openapi.json`,
      2026-10-21) for the 14 missing routes: params, bodies, response keys
- [x] 1.3 Pin the credit table (`agent-docs.akta.pro/getting-started/pricing`,
      2026-10-21)

## 2. Endpoints (14)

- [x] 2.1 Company readers: concise, markdown, logo, partnerships, peers, swot
- [x] 2.2 Alternative signals: headcount-trends, website-traffic, jobs, posts
- [x] 2.3 List generation: filters/list, filters/options,
      list/generate/companies
- [x] 2.4 News: news/by-id
- [x] 2.5 `zCompanyPathParams` in `schema/common.ts`

## 3. Identity and tests

- [x] 3.1 Add the 14 ids to `connectors/ids.lock.json` (other providers'
      drift untouched)
- [x] 3.2 Synthetic happy fixture + replay and estimate tests per endpoint;
      a synthetic 401 on jobs
- [x] 3.3 Widen the akta provenance test to 20 docs
- [x] 3.4 `deno task check && deno task test`

## 4. Follow-ups

- [ ] 4.1 Record real fixtures with an Akta key (`deno task record`) and
      confirm each trailing-slash path answers 200, not 307
- [ ] 4.2 Re-pin `company-enrichment` to the current credit table
      (`management_profile` 1, `industry` 0.5) after a live check
