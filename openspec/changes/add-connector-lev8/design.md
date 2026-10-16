# Design: add-connector-lev8

Decision record for the Lev8 connector (new; not a v1 port). Only the
choices the declarative model forced are recorded. Input schemas mirror the
OpenAPI request schemas (docs.lev8.com/openapi.yaml, 2026-10-16); prices
are docs.lev8.com/guides/billing (2026-10-16), checked against Lev8's own
settlement implementation.

## D1 — Five endpoints, identity from the path

`POST /v1/contact-search`, `/v1/deep-search`, `/v1/enrich` and
`/v1/extract` take their ids from `request.path` (design D22):
`lev8#v1/contact-search` and so on. Entity Search's create route is
plumbing — the catalog surface is the whole search — so its id is pinned
with `endpoint: "/v1/entity-search"` while the request still posts to
`/v1/entity-search/create_task`.

## D2 — No credit balance

`GET /v1/credit/balance` returns the balance of the account behind the
token. Through Monid that is the shared house account, the same for every
caller and meaningless to any of them; exposing it would only leak the
house's float. Operators read it in the Lev8 console.

## D3 — `Idempotency-Key: {runId}:<op>` on every paid call

Lev8 saves a completed response together with its settlement and replays it
for the same token + `Idempotency-Key` + body at no extra charge; without a
key it mints a fresh one, so a retried request is a second purchase. Hook
fns see the host-stable run id only in a lifecycle (design D34), so the
provider authors a start-only lifecycle that relays the compiled request
with `Idempotency-Key: {runId}:call` (the orbit posture). Entity Search
replaces it with its own start (`{runId}:create_task`) and poll. Callers
cannot pass their own key: every caller shares one Lev8 token, so a key
taken from Lev8's docs would collide across callers (`409`, or another
caller's replay).

## D4 — One pool, no consolidate; business failures bill 0

Lev8 meters one credit pool. No response carries a receipt, so there is no
claim to pluck: each endpoint's model × evidence is the bill (the derived
fold, the pdl / keenable posture). Deep Search, Enrich and Extract answer
HTTP 200 with `success: false` on a business-level failure, which Lev8
settles at zero; a flat PER_CALL would bill it. So Deep Search and Enrich
are PER_UNIT `RESULT` at 2 credits, evidence 1 when `success === true` and
0 otherwise. The estimate promises one.

## D5 — Contact Search: two lines, keyed by the requested type

Email found is 10 credits, phone found 30, not found 0 — "found" being
`result.content` non-empty after trimming, Lev8's own rule. The price
follows the REQUESTED `contact_type`, so the model is a COMPOSITE of
`email_found` and `phone_found` (PER_UNIT `RESULT`), and both the estimate
and the evidence key the line from the input. The estimate promises a hit.

## D6 — Extract: a block-rated list line and a flat web2list line

Social and GitHub lists bill 1 credit per five returned items, rounded up
(Lev8 settles `(len(data) + 4) / 5`): PER_UNIT `RESULT` with `every: 5`,
evidence `len(data)`, so the engine's `ceil(n / 5)` fold matches exactly.
`web2list` bills a flat 80 on success: PER_UNIT `PAGE`, evidence 1 when
`success === true`. The estimate mirrors Lev8's reservation — `limit`
(default 100, applied at the binding) for lists, one page for `web2list`,
which ignores `limit`. `web2list` requires `instruction` and a public URL;
that cross-field rule cannot compile and lives in the endpoint notes.

## D7 — Entity Search: one run drives create → status → fetch

- **start** relays `create_task`. A non-2xx is data: 422, 402 and 429 all
  fail before Lev8 reserves anything. A 2xx without `leads_search_id` is a
  contract violation (non-retriable throw).
- **poll** reads `status`. `created` / `running` (or an unknown status) stay
  RUNNING. On `done` or `error` it pages `fetch` from `pts` 0 until it has
  `ready_count` entities — `fetch` may return fewer than `num`, so the next
  `pts` is `pts + count`, capped at 500 per page and 100 pages.
- A `status` or `fetch` answering 408 / 429 / 5xx THROWS (retriable): the
  task is still running, or already billed, upstream, and settling on a
  failed lookup would drop paid work. Any other non-2xx settles as data —
  `404` means the task outlived Lev8's recovery window and was refunded.
- No stop: Lev8 exposes no cancel. A started search runs to its terminal
  state and bills even if the run is abandoned (stated in the notes).
- The output is `{leads_search_id, status, stop_reason?, ready_count,
  count, entities}`. `leads_search_id` is kept because callers can pass it
  to a later run's `dedup_lev8_leads`.
- Timeouts: 30 s per request, 30 min per run, 10 s poll cadence.
  Xiaohongshu and WeChat searches usually take 1 to 2 minutes before the
  first results.

## D8 — Entity Search billing: startup + ready_count × rate

Lev8 settles a `done` task at `startup + ready_count × per-result` and an
`error` task at `ready_count × per-result` (startup refunded). Startup is 5
credits, 20 with `enable_web_search`; per-result is 10 for the four
`*_creator` types and 2 for everything else. Model: COMPOSITE of `startup`
(PER_UNIT `CREDIT`, 1 each — the count IS the startup fee, so one line
carries both rates), `results` (2) and `creator_results` (10). Evidence
reads the settled output: `startup` is the fee when `status === "done"`, 0
otherwise; the result line counts `ready_count` — Lev8's billing count, not
`verified_count`, which includes rejected candidates.

Because an `error` task still bills its ready entities, the poll settles an
`error` with `ready_count > 0` as 200 with those entities; settling it as a
failure would zero the run while Lev8 still charges the house. An `error`
with no entities settles as a synthesized 500 (providerHttpStatus 200) at
zero usage. The estimate is Lev8's own reservation: `startup + limit ×
rate`, with `limit` (default 20) and `enable_web_search` (default false)
applied at the binding.

`xiaohongshu` and `wechat` require `enable_web_search: true`. The OpenAPI
states it as `if/then`, which cannot compile; it lives in the notes. A miss
is a free 422.

## D9 — Strict mirrors

Every Lev8 request schema is `additionalProperties: false` and Lev8 answers
422 to unknown fields, so the mirrors are `z.strictObject`. Enrich's
`enrich_fields` is itself a JSON Schema: strict at the top, open inside
(`type: "object"`, `properties` required). The non-empty `properties` rule
and the byte limits (4,000 UTF-8 bytes for an objective, 16 KiB of entity
context, 256 KiB of schema) are Lev8-side checks stated in the describes.
