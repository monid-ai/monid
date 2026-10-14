# Tasks: add-hunter-hiring-filters

## 1. Schema and endpoint bindings

- [x] Add the documented optional hiring fields to the shared filter mirror.
- [x] Accept hiring-only inputs on both structured discovery endpoints.
- [x] Update the discovery description and selecting-filter documentation.

## 2. Tests and vendor evidence

- [x] Add valid/invalid compiled-input cases and keyword boundary coverage.
- [x] Add exact outgoing URL, POST method and JSON-body assertions.
- [x] Verify positive and impossible-title queries against Hunter Discover.
- [x] Run both query shapes through both compiled connector endpoints;
      confirm HTTP 200, applied filters and zero usage.
- [x] Record all four live calls and minimize the common response fields into
      provider-level non-empty and empty hiring fixtures.
- [x] Add recorded replay cases on both endpoints, including empty-success
      handling, applied-filter metadata and zero usage.
- [x] Run the updated Hunter suite after adding the recorded replay cases.

## 3. Final checks

- [x] Run the full type-check and replay suite: `deno task check` and
      `deno task test`.
- [x] Check formatting and lint for changed TypeScript/JSON files.
- [x] Run `deno task version:check` and `git diff --check`.
- [x] Inspect both compiled endpoint schemas and review the final diff.

## Check results (2026-10-14)

The contributor reported the updated Hunter suite passing with 69 passed,
0 failed and 13 ignored; the full suite passed with 1263 passed, 0 failed and
215 ignored. Type-check, formatting, lint and the version gate passed. The
version gate reported no contract-surface changes and no required engine bump.
Final local review confirmed both compiled schemas expose the hiring fields
and hiring-only selecting arm with the existing FREE usage model.

## Review follow-up: non-negative role counts

- [x] Add `.min(0)` to both open-role bounds in the shared mirror.
- [x] Cover zero acceptance and negative rejection on both endpoints.
- [ ] Re-run type-check and Hunter replay tests after the boundary fix.

## Verification limits

Live evidence covers `hiring: true`, department `engineering`, `last30d`, and
one impossible title include keyword. Remaining field combinations have local
schema/request coverage. Hosted Monid publication has not been verified.
