# Proposal: add-connector-salesbook

## Why

SalesBook (maxeds.org/tools/salesbook) is a directory of technology
companies that sell to enterprises, ranked by sector on a published
methodology, published by MaxedS. Agents doing vendor research (shortlist vendors for a problem, check
one company, find alternatives, compare a shortlist) can call it today over
MCP or REST. This change makes the read-only REST surface discoverable
through Monid. SalesBook is free and keyless, so it adds a no-cost option to
the `company-enrichment` category.

## What Changes

- **connectors/salesbook**: five synchronous JSON POSTs on one host
  (`https://mcp.maxeds.org/v1/tools/<tool>`), mirrored from the published
  OpenAPI (`/v1/openapi.json`, v0.5.0, read 2026-10-22):
  `search_startups`, `get_profile`, `get_ranking`, `find_alternatives`,
  `compare_vendors`.
  - **Read-only.** The vendor's write tools (`report_correction`,
    `update_listing`, `opt_in_for_intros`, `agent_mailbox_checkin`, the
    `/v1/mailbox` routes) and the seller-side tools (`check_listing`,
    `find_prospects`, `get_buying_windows`) are not ported.
  - **Keyless.** The API takes no credential. The provider declares an
    empty credential shape (`z.object({})`) and an identity `auth.inject`
    (`({ data }) => data.request`): `inject` must resolve, `{}` validates
    against `{}`, and the request egresses exactly as built (a test pins
    the egress: URL, method, `content-type` only, body as given).
  - **FREE.** Provider-level `UsageModelKind.FREE` (tinyfish posture): no
    credit pool, no consolidate, compiler-synthesized quantities.
  - **Nothing mapped.** Responses are `{ text, isError }` and pass through
    untouched (no `toRequest`, `fromResponse` or `fromError`), so source
    URLs, checked dates and the methodology version reach the caller as
    the vendor wrote them. Vendor failures are non-2xx with
    `isError: true` and settle at zero.
  - **Bindings** carry the vendor's own documented bounds: non-empty
    `query` / `startup_id` / `company`, `limit` 1-25 (search) and 1-15
    (alternatives), `vendors` 2-5 non-empty strings. Vendor defaults
    (`limit` 10 / 5, `period` current) are left to the vendor: nothing is
    estimated, so nothing needs materializing.
  - **Timeouts** 15 s request / 20 s run (observed 0.2-0.7 s).
- **Fixtures**: eleven recorded from the public API on 2026-10-22 (a
  handful of calls, public data only, no headers kept) and three
  synthetic (429 daily cap, 503 maintenance, 500 edge error) whose shapes
  come from the vendor's REST handler. `ranking-ok` is hand-trimmed to 3
  of 100 entries and says so.
- **ids.lock.json**: the five new ids.

## Capabilities

- `salesbook-connector`.

## Non-goals

- No engine, schema, preset, category or test-tooling change;
  `ENGINE_VERSION` untouched.
- No parsing of `text` into structure. `get_ranking`'s `text` is a JSON
  document and the endpoint description says to parse it; the others are
  prose lines. Structuring them is a vendor-side change, not a connector
  one.

## Impact

New connector tree, five ids in `connectors/ids.lock.json`,
`openspec/changes/add-connector-salesbook`. No contract change.
