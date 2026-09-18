# Design: add-connector-keenable

Decision record for the Keenable connector (new; not a v1 port). Only the
choices the declarative model forced are recorded; the input schemas
mirror OpenAPI SearchRequest / fetch parameters (docs.keenable.ai
api-reference/openapi.json, 2026-09-16).

## D1 — Authenticated REST only

Keenable ships each operation twice: a keyed path (`POST /v1/search`,
`GET /v1/fetch`, `X-API-Key`) and a keyless `/public` twin
(`X-Keenable-Title`, shared 1,000 req/hour per IP, no credits). The
catalog is a metered, keyed surface. The public twins are an evaluation
tier with a different auth header, different rate-limit identity, and
no usage — exposing them would be a second provider with a different
auth inject and a FREE model, which is its own change if anyone wants
it. Both docs call the keyed paths. Identity is inferred from
`request.path` (design D22): `keenable#v1/search` and
`keenable#v1/fetch`. No authored `endpoint:` pin.

## D2 — One pool, PER_CALL 1, no consolidate

Credits docs (2026-09-16): authenticated usage is metered in credits;
"search and fetch each cost one"; 100,000 requests/month free, then
purchased packs. REST JSON carries no usage object. MCP reports
`_meta["keenable/usage"]` (`sku`, `amount`, `credits`, `paid`) beside
the tool result, which this HTTP connector never sees. Response headers
on the public twin were rate-limit only (`X-RateLimit-*`,
`X-Request-Id`); no usage header is documented for REST.

So there is no vendor claim to pluck (no `usage.consolidate`) and the
derived fold settles — the pdl posture. One pool `default` ("Keenable
credits"), a provider-level `PER_CALL` of 1 inherited by both docs.
Quantities fns are compiler-synthesized. Search mode SKUs
(`search.realtime` / `search.pro`) are not request-selectable (D3) and
are published as one credit either way.

Rejected: two pools keyed on SKU (the caller cannot choose, and REST
does not report which SKU ran); a FREE model (authenticated calls draw
the monthly allowance).

## D3 — Search `mode` is not a request field

Credits: "Search mode is not a request parameter. Over MCP an
integrator can pin it with `_meta[\"keenable/overrides\"]`; otherwise
the mode is decided per call." OpenAPI SearchRequest has no `mode`.
The Python SDK documents a `mode` argument; that is not the HTTP
surface this connector speaks.

The search body is `z.looseObject` so unspecified vendor-forward keys
ride through, plus `mode: z.never().optional()` so a payload that
includes `mode` fails INVALID_INPUT rather than being dropped on the
floor or sent and 400'd upstream. The response may echo `mode` (`"pro"`
observed on the public twin 2026-09-16); it rides the payload, unused
by billing.

## D4 — `fetch.live` is not on the catalog

`live=true` is a documented query param and a separate SKU
(`fetch.live`) that "draws more than one credit per call". No number is
published; prices are "per-organization"; REST has no receipt. Exposing
`live` under the provider PER_CALL of 1 would undercount every live
fetch. The catalog fetch is indexed-only: `live` is not a request
parameter. A published rate or a REST usage field is a follow-up
(tasks 3.4).

## D5 — Fixtures: recorded 401, synthetic happy

A malformed key against the keyed paths (2026-09-16) returned HTTP 401
`{error: "Authentication failed", message: "Malformed API key"}` on
both endpoints. Auth docs table lists malformed keys as 400; the live
keyed endpoint answered 401. Those two chains are recordings.

Happy chains are `synthetic-`: the response shape was read off the
public twins the same day (search: `query`/`mode`/`results[]` with
`title`/`url`/`description`/`snippet`/`published_at`/`acquired_at`;
fetch: `url`/`title`/`content`/`description`) and the request URL was
rewritten to the authenticated path the doc calls. Replay matches
method+URL; search uses `{{request.url}}`, fetch pins the engine's
`URLSearchParams` encoding of `url=https://example.com`. Replace via
`deno task record` when `KEENABLE_API_KEY` exists.
