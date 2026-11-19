# Proposal: add-connector-hirebase

## Why

[Hirebase](https://www.hirebase.org) is a jobs data API: structured, live job
postings and hiring-company data read directly from company careers pages and
applicant tracking systems, re-checked around the clock and deduplicated to one
record per job. Submitted by the vendor (Hirebase). The `jobs` category today
holds scrapers of single job boards and job-posting side endpoints of
enrichment providers; this adds a provider whose whole product is job data,
with search by filters or by meaning, market aggregates and salary benchmarks.

## What Changes

- **connectors/hirebase** — provider (`presets.auth.header("x-api-key")` on
  `https://api.hirebase.org/v2`) + 10 endpoints:
  - `jobs/search` — filtered job search (`PER_UNIT`, 1 `jobs` unit per job
    returned).
  - `jobs/estimate` — the match count for a search's filters (`FREE`).
  - `jobs/neural-search` — semantic search by plain-English query, similar
    jobs or a stored resume, with optional filters (`PER_UNIT`, 1 `jobs` unit
    per job returned).
  - `jobs/{job_id}` — one full job record (`PER_CALL`, 1 `jobs` unit).
  - `companies/search` — company discovery (`PER_UNIT`, 1 `companies` unit
    per company returned).
  - `companies/{company_slug}` — one company profile (`PER_CALL`, 1
    `companies` unit).
  - `companies/{company_slug}/jobs` — one company's open jobs (`PER_UNIT`, 1
    `jobs` unit per job returned; an unknown slug answers 200 and empty).
  - `jobs/expired-jobs` — identifiers of jobs closed in the last 14 days
    (`FREE`).
  - `jobs/insights` — aggregates over a search-shaped cohort (`PER_CALL`, 1
    `insights` unit).
  - `jobs/salary-benchmark` — a queued report polled to completion through
    `lifecycle.start` / `poll` (`PER_CALL`, 1 `salary_benchmarks` unit).
- **Billing** — four credit pools, one per allowance the vendor meters
  (`jobs`, `companies`, `insights`, `salary_benchmarks`), per the published
  rate card
  (https://www.hirebase.org/docs/api-reference/billing/usage-headers). The
  vendor's meter rides response headers, not the body, so there is no
  `usage.consolidate`; the provider `usage.evidence` counts the returned
  `jobs` / `companies` array, which is exactly the vendor's rule. An empty
  result and every non-2xx bill nothing.
- **Inputs** — strict bodies (Hirebase answers 422 for unknown fields; inside
  neural search's `lexical` object it silently ignores them, so strictness
  there turns a silent unfiltered result into an error before the wire).
  `limit` is required and capped at 100 at each per-result binding.
- **Output** — provider `output.fromError` turns the `{detail}` envelope
  (a sentence, or a list on 422) into one message beside the raw body. The
  salary benchmark's `output.fromResponse` returns the report itself and drops
  the task's queue bookkeeping.
- **Fixtures** — recorded against the live API on 2026-11-18 (trimmed by the
  recorder; the salary benchmark chain hand-minimized): a happy path per
  endpoint, an empty search, an unknown company slug, a 401, a 422, a 400 and
  a 404.
- **openspec/changes/add-connector-hirebase** — this proposal; no `design.md`
  (no schema or engine contract change, no new Units, no new category).

Not included in this change: exports and historical-data purchases (priced per
dataset, not per call), hiring-manager contacts (a separately priced add-on)
and the technologies endpoints. They can follow as their own changes.

## Capabilities

- `hirebase-connector`.
