# Proposal: add-connector-scraper

## Why

[Scraper](https://scraper.run) is a web-data API that returns structured
JSON from public sites, one synchronous `POST` per tool, priced in its own
credits (1 credit = $0.001 on every plan, https://scraper.run). Submitted
by the vendor. The job boards are the first slice: Indeed, LinkedIn,
Glassdoor, Naukri, and Upwork already give an agent job search, job
detail, company profiles, reviews, salaries, and interviews behind one API
key and one credit pool, which today takes several vendors.

## What Changes

- **connectors/scraper**: provider (`presets.auth.bearer()` on
  `https://scraper.run/api/v1/tools`) + 17 endpoints across five
  platforms:
  - Indeed: `indeed/jobs`, `indeed/companies`.
  - LinkedIn: `linkedin/jobs`, `linkedin/job-detail`, `linkedin/post`.
  - Glassdoor: `glassdoor/jobs`, `glassdoor/job-detail`,
    `glassdoor/company-jobs`, `glassdoor/company-profile`,
    `glassdoor/company-reviews`, `glassdoor/company-salaries`,
    `glassdoor/company-interviews`, `glassdoor/company-benefits`.
  - Naukri: `naukri/jobs`, `naukri/job-detail`.
  - Upwork: `upwork/jobs`, `upwork/job-detail`.
- **Billing**: one `default` credit pool. Fifteen endpoints are leaf
  `PER_CALL` at 1 or 2 credits (the vendor's per-tool rate card).
  `indeed/companies` is leaf `PER_UNIT` per started block of 25 requested
  profiles. `naukri/jobs` is COMPOSITE: 1 credit per call plus 1 when
  `fetchDetails` is true. A provider-level `usage.consolidate` lifts the
  vendor's own meter (`meta.creditsUsed`) off the output, and each
  endpoint's rate card is the cross-check (a disagreement would surface
  as `usage.mismatch`).
- **Inputs**: each body mirrors the vendor's request schema and is
  `.strict()`. Where the vendor takes "exactly one of `jobId` or
  `jobUrl`", the schema is a union of strict objects. Vendor defaults live
  in the `.describe()` text, except `indeed/companies.maxItems`, whose
  default is applied at the binding site because the estimate needs it.
- **Errors**: provider-level `output.fromError` normalizes the vendor's
  RFC-9457-style problem body (`message`, else `code`).
- **Provider-level fixture chains**: one real recording per endpoint,
  trimmed by the recorder, plus the `fetchDetails` variant of
  `naukri/jobs` and a recorded 401. `{{request.url}}` bindings. Free text
  and people in the LinkedIn post and Glassdoor review recordings are
  replaced with placeholders.
- **openspec/changes/add-connector-scraper**: this proposal; no
  `design.md` (no schema/engine contract change, no new Units).

## Capabilities

- `scraper-connector`.

## Non-goals

- The other platforms Scraper serves (travel, review sites, social,
  search, finance, and local business listings). They follow in separate
  pull requests, one platform family at a time, under the same provider.
- The generic `/api/v1/scrape` endpoint and `/api/v1/usage` (a different
  base path from `/api/v1/tools`, and account plumbing, not agent
  capability).
- New categories: every endpoint uses the existing `jobs`, `linkedin`,
  `company-reviews`, and `company-enrichment` entries.

## Impact

New connector tree plus 17 lines in `connectors/ids.lock.json`. No
schema, engine, or compiler changes. The version stays.
