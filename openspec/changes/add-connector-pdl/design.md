# Design: add-connector-pdl

Decision record for the pdl port (v1 `adaptors/pdl`, 4 defs). Only the
choices the declarative model forced are recorded.

## D1 — The SDK's wire form, not v1's def shape

v1 declared every def `POST` + JSON body because its default relay only
forwarded a body on non-GET and the `peopledatalabs` SDK did the real
transport. Read off SDK 14.1.1 (`dist/index.modern.js`): enrichment is
`axios.get(…/{person|company}/enrich, {params: URLSearchParams})`, search is
`axios.post(…/{person|company}/search, {query|sql, size, …})`, auth header
`X-Api-Key`. The docs speak that form: enrichment inputs are `queryParams`
(every parameter is a scalar — the engine's scalar-only query rule holds),
search inputs are `body`. Caller-visible consequence: the v1 body-shaped
enrichment input becomes query-shaped. The SDK's `rateLimit` block that v1
stripped was assembled client-side from headers — the raw REST body never
carries it, so nothing is stripped.

## D2 — One credit pool per PDL credit type

PDL's body carries no meter; the response headers do, and hooks cannot
read headers — so there is no vendor claim (no `consolidate`) and the
pools are declarations. PDL meters per credit TYPE: every call's
`x-call-credits-type` header names the type it drew from (docs
usage-limits: `enrich`, `search`, `search_company`, `enrich_company`,
`enrich_skill`, `enrich_job_title`, `preview_search`, `person_identify`)
and the `x-totallimit-remaining` beside it is that type's balance. The
four ported endpoints map 1:1 onto four types. The compiler resolves
`credits` provider ?? endpoint and requires every declared pool to be
drained by the doc, so the provider declares NO pool and each endpoint
declares the one it drains, id = the vendor's type string verbatim, at 1
credit per match / record (first endpoint-level `credits` in the catalog). First version declared ONE pool
(`default`), reasoning from v1's balance probe — which read a single
`x-totallimit-remaining` off a person-enrich miss and therefore saw the
`enrich` balance only; corrected on PR #7 review (2026-09-16, "There are
more than one type of credits in PDL"). The per-record draw stays pinned
at 1 for every type; a real call's `x-call-credits-spent` confirms it
when a key exists (tasks 3.3).

## D3 — `size` required at the binding, on both variants

D25's standing rule (the primary limiting knob is REQUIRED even when the
vendor publishes a default — PDL's is 1). The mirror is a union of two
strict variants (`query` | `sql`); the binding rebuilds the union with
`size` required on each (`.required({ size: true })` — the akta form; it
keeps the field's describe, which `.unwrap()` would drop from the
compiled doc), so `data.input.body.size` is typed `number` in the
estimate. Vendor bounds 1–100 stay in the mirror.

## D4 — One v1 refinement dies, one survives

The enrichment identifier rule ("one direct identifier, or a name plus a
location-ish field") was a `.superRefine` — unrepresentable in JSON Schema
(D6 of the second wave); documented in the schema `describe`, PDL answers
400 `invalid_request_error`. The search `query` XOR `sql` rule was
`z.union` of two `.strict()` objects — that compiles to `anyOf` of two
`additionalProperties: false` schemas, so a body with both, or neither,
fails validation. Pinned by a test.

## D5 — Synthetic fixtures until a key exists

No `PDL_API_KEY` is held. Fixtures follow the v1 adaptor tests and the PDL
references: person enrichment `{status, likelihood, data}`, company
enrichment flat (record fields beside `status`/`likelihood` — no `data`
wrapper), search `{status, data[], total, scroll_token}`, and the
documented error envelope `{status, error: {type, message}}`. Unverified
against real traffic; replace via `deno task record`.
