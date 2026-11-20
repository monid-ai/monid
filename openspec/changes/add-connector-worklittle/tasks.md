# Tasks: add-connector-worklittle

## 1. Provider + shared schemas

- [x] 1.1 provider.ts: bearer auth, baseUrl, USD pool, quota-stripping
      consolidate, `{error: {code, message}}` fromError
- [x] 1.2 schema/filters.ts (search + salary average), documents.ts,
      applicants.ts, apply.ts (apply + batch options)

## 2. Endpoints (8)

- [x] 2.1 Reads: jobs/search (+ job_id), jobs/salary-average,
      companies/search (FREE)
- [x] 2.2 Documents: resumes, cover-letters (async, $0.01, D3)
- [x] 2.3 Apply: apply, 1–10 jobs (async, $0.20 per outcome, D4/D5)
- [x] 2.4 Management: apply/{id}, apply/profile (FREE)

## 3. Fixtures + tests

- [x] 3.1 Synthetic fixtures shaped from jobs-api source (2026-10-29)
- [x] 3.2 Tests: ids + pools + auth, happy / provider-error / schema
      gates per endpoint, async chains (success, failed, replay,
      rejected, transient, no-file), apply outcomes vs failures vs test,
      batch sum, wire checks (async: true, use_profile: false,
      Idempotency-Key), lifecycle interning
- [x] 3.3 Confirmed against the live API with an org key (2026-11-02):
      every fixture's status and fields match real responses. Synthetic
      fixtures kept (real ones hold a person's email and live job data);
      `deno task record` in Monid's repo with Monid's key is the last check

## 4. Wiring + docs

- [x] 4.1 ids.lock.json (8 worklittle ids)
- [x] 4.2 OpenSpec proposal / design / spec
- [x] 4.3 Verify: fmt · lint · check · test
