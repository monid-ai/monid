# Tasks: add-connector-hirebase

- [x] Provider: auth header, base URL, four credit pools, `usage.evidence`,
      `output.fromError`.
- [x] Shared schema fragments (`schema/common.ts`) for the job filters and
      enums used by 2+ endpoints.
- [x] Endpoints: `jobs/search`, `jobs/estimate`, `jobs/neural-search`,
      `jobs/{job_id}`, `jobs/expired-jobs`, `companies/search`,
      `companies/{company_slug}`, `companies/{company_slug}/jobs`,
      `jobs/insights`, `jobs/salary-benchmark` (lifecycle start/poll).
- [x] Fixtures recorded live and trimmed; no credential or account identifier
      in any fixture.
- [x] Per endpoint: happy replay (whole output and usage), recorded 401,
      schema gate (INVALID_INPUT plus a passing twin), gated live test
      asserting shape; all 10 endpoints
      verified live (2026-11-18 and 2026-11-19).
- [x] `connectors/ids.lock.json` updated (10 new endpoint ids).
- [x] `deno task check`, `deno task test`, `deno task lint`, `deno fmt --check`,
      `deno task ids:check`, `deno task version:check` pass.
