# Proposal: add-connector-worklittle

## Why

Worklittle (worklittle.com) indexes over a million live job postings read
directly from company career pages and applicant tracking systems,
refreshed hourly, and applies and submits for people in its own cloud
browser. Agents on Monid get job search, job detail, salary averages and
employer lookup for free, plus paid applications ($0.20) and tailored
resumes / cover letters ($0.01) — one Worklittle platform key for every
Monid user. No new engine capability.

## What Changes

- **connectors/worklittle** — 8 endpoints (one per job an agent does, so
  the Monid tool page lists 8 cards), bearer auth
  (`sk-wl-api01-…`), base `https://api.worklittle.com`, one credit pool
  `default` = US dollars (every Worklittle price is a flat USD amount;
  `GET /v1/pricing`, 2026-10-29).
  - FREE reads: `jobs/search` (GET /jobs; `job_id` returns one job in
    full), `jobs/salary-average`, `companies/search` (GET /companies).
  - FREE `apply/profile` (POST /v1/apply/profile, `action` save / get / delete):
    create or update the person (resume included); get returns their
    profile, applications and employer emails; delete erases them.
  - FREE `apply/{id}` (POST /v1/apply/{id}, `action` status /
    continue / approve_submit / stop).
  - PAID, async: `apply` (POST /v1/apply, 1–10 `job_ids`): applies
    and submits for the person in Worklittle's cloud, automatically;
    $0.20 per application that reaches an outcome, failures free. `resumes` / `cover-letters`
    (POST /v1/resumes, /v1/cover-letters, `async: true` + GET
    /v1/documents/{id}): $0.01 per document returned.
- **Provider consolidate** makes no claim (responses carry no money, so
  the derived fold settles) and strips the quota counts at `meta.quota`:
  they describe Monid's shared Worklittle account, not the caller.
- **Provider fromError** lifts Worklittle's `{error: {code, message}}`
  into `{message, code, raw}`.
- Fixtures are all `synthetic-` (no key yet), shaped from the jobs-api
  source on 2026-10-29.

## Capabilities

- `worklittle-connector`.

## Non-goals

- `/v1/applicants/{id}/settings` (auto-apply bills outside any Monid run),
  `/v1/apply-settings`, job map, market stats, People Search, Worklittle
  Business (posting, ATS), webhooks.
- `summary=true` on job detail (token-billed AI, off for API keys).

## Impact

New connector tree + 8 lines in `connectors/ids.lock.json`. No
schema/engine change — `ENGINE_VERSION` unchanged, no new Unit, preset,
hook or category leaf (`jobs`, `company-enrichment` exist).
