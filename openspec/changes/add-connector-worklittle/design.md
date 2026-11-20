# Design: add-connector-worklittle

Choices the declarative model forced. Source of truth: the jobs-api
source (`services/jobs-api/src/public/routes/*`) and `GET /v1/pricing`,
2026-10-29.

## D1 — One USD pool; free reads are FREE models

Worklittle prices every paid call as one flat USD amount and never bills
tokens, so the pool is dollars (the exa / dataforseo posture). Search,
detail, salary average and company search draw free monthly quotas
(company workspace: 3M list rows, 300k detail calls); over quota is a 429,
never a charge, so they are `FREE`.

## D2 — No vendor claim; quota counts are stripped

Worklittle responses carry no money (flat prices live on
`GET /v1/pricing`), so every bill is the derived fold: evidence × the
pinned rate. Free reads carry quota counts at `meta.quota`; they describe
Monid's shared account, so the provider consolidate plucks them out.

## D3 — Documents are async

A ready resume takes ~30 s synchronously. `start` always sends
`async: true` with `Idempotency-Key: {runId}` (202 `{id}`), `poll` reads
`GET /v1/documents/{id}`. A 200 on submit (an Idempotency-Key replay of a
finished document, or no async queue) is terminal. A failed job answers
HTTP 200 `{status: failed, error}` without its own HTTP status, so the
lifecycle maps the error code back (BAD_REQUEST → 400, PAYMENT_REQUIRED →
402, …, else 500). The resume and cover-letter lifecycles are
byte-identical and intern to one fnTable entry each.

## D4 — Apply completes at the first non-running status

`POST /v1/apply` answers in under a second; `poll` reads
`GET /v1/apply/{id}` every 10 s until the status leaves queued/running,
normally `completed`. `failed` is a 502 provider error (free).
`awaiting_input` / `awaiting_submit` / `stopped` / `cancelled`
complete the run with the session in the output and `next_step`, so the
agent can use the free management endpoints. When every application in
the call is refused or failed, the call is one free 502
(`ALL_APPLICATIONS_FAILED`, each reason listed).

`runMs` is 2 hours. Each application is a real browser filling a real
employer form in Worklittle's cloud; most finish in minutes, but in
Worklittle production (30 days to 2026-11-20) about 6% of submitted
applications ran past 45 minutes. Past `runMs` the engine calls `stop`,
which cancels nothing: the person asked for these applications and they
finish upstream on their own. `stop` reads each application once more and
settles through the one pipeline (D34): what reached an outcome bills,
what is still running bills nothing and comes back with its
`session_id` for `apply/{id}`.

`Idempotency-Key: {runId}:submit` (Worklittle derives
`<key>:<job_id>` per batch job). The lifecycle always sends
`use_profile: false`: Monid's key is shared.

## D5 — Apply billing: status evidence

PER_UNIT RESULT at $0.20 (Monid's key is a company key, which always pays
the standard price). Evidence counts an application whose final status is
one Worklittle charges for. Worklittle's public status alone says whether
an application was charged: `awaiting_input`, `awaiting_submit`,
`completed` and `stopped` (the person stopped it after it started filling
in) are; `cancelled` (stopped before anything was filled in), `failed`
(anything on Worklittle's side), already-applied, hosted-form and `test`
count 0. The batch sums
over its jobs; per-job rows live in typed lifecycle state.

## D6 — Inputs

Query/body schemas are strict (Worklittle ignores unknown params, so a
typo would silently widen a search). Exact-match filters are enums
(a misspelled value matches nothing upstream). Not mirrored:
`include=salary_average` (reroutes GET /jobs), `summary` (token-billed),
`use_profile`, `resume_id`, `webhook_url`, `candidate`,
`confirm_same_company`, `/v1/applicants/{id}/settings`, `steer`.

## D7 — One endpoint per job

Monid's tool page shows one card per endpoint, so each endpoint is one job
an agent does and related routes share one: `apply` takes 1–10 jobs,
`apply/{id}` and `apply/profile` take an `action`, and `jobs/search`
takes `job_id` for one job in full. Each card has one price: the merged
actions are all free, and `apply` bills per application. Resumes and
cover letters stay separate cards (separate products for an agent).
