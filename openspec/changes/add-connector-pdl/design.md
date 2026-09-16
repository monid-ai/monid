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

## D2 — One credit pool; the per-record draw is a pin to re-verify

PDL's body carries no meter; the `x-call-credits-spent` /
`x-totallimit-remaining` headers do, and hooks cannot read headers. So
there is no vendor claim (no `consolidate`) and the pool is a declaration.
monid-services models the account as ONE pool: a single `PDL_API_KEY`
serves person and company calls, and its balance probe (MONID-185) reads
one `x-totallimit-remaining` number as `{unit: "credits"}` — the
single-sample path, not the multi-pool array contactout uses. Two typed
pools (`person` / `company`) were considered because v1's unit prices
differ ($0.265 vs $0.10 per record); rejected — that ratio is just as
consistent with one pool where a company record spends less than a full
credit, and nothing in v1 or the PDL docs shows two balances. Pinned: 1
credit per person record/match, 1 per company record/match. OPEN: the
company draw may be fractional — only `x-call-credits-spent` on a real
call can say; re-pin `consumes.amount` when a key exists (tasks 3.3).

## D3 — `size` required at the binding, on both variants

D25's standing rule (the primary limiting knob is REQUIRED even when the
vendor publishes a default — PDL's is 1). The mirror is a union of two
strict variants (`query` | `sql`); the binding rebuilds the union with
`size` unwrapped on each, so `data.input.body.size` is typed `number` in
the estimate. Vendor bounds 1–100 stay in the mirror.

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
