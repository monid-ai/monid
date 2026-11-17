# Proposal: add-hunter-hiring-filters

## Why

Hunter documents company discovery by hiring activity, but the connector
rejects `job_openings` as an unknown field. A hiring-only request also fails
the existing requirement to provide at least one recognized filter. Agents
cannot express these searches through the structured Hunter tools.

## What Changes

- Add the optional `job_openings` object to the shared Discover filter mirror:
  `hiring`, `department`, `job_title.include` / `exclude`, `posted_date`,
  `open_roles.from` / `to`, and `include_closed_roles`.
- Accept `job_openings` as a selecting filter on `hunterio#discover` and
  `hunterio#discover/people`, both alone and with existing filters.
- Describe the capability on company discovery and preserve the existing
  request body, credential injection, output handling and FREE usage model.
- Add compiled-input, outgoing-request and recorded-response regression tests.
  Two provider-level fixtures retain the common response fields needed to
  exercise non-empty and empty hiring searches on both endpoints.

## Verification Evidence

On 2026-10-14, direct Hunter Discover requests and compiled-connector calls
returned matching companies for `hiring: true`, department `engineering`, and
`posted_date: last30d`. Adding the job-title include keyword
`zz_monid_filter_probe_20261014_zz` returned zero matches. Both connector
endpoints completed with HTTP 200, echoed the filters and recorded zero usage.
The contributor recorded both scenarios on both routes with `deno task record`.
Shared fixtures derive from the Discover recordings; endpoint-specific people
aggregates are omitted from these common response shapes.

These calls verify those specific inputs. Other posting windows, false/closed
role flags, title exclusions, role-count ranges and keyword-array boundaries
have local schema/request coverage, not independent live verification.

## Impact

Existing Hunter connector only. No new endpoint identities, category, engine
capability, credential shape or billing rule. No engine version bump.

## Sources

- https://hunter.io/api-documentation/v2#discover
- https://hunter.io/api-documentation/v2#discover-people

The mirror has no defaults. Department names remain case-sensitive strings
rather than an invented closed enum. Cross-field role-range ordering remains
vendor-validated, consistent with the existing range mirrors.
