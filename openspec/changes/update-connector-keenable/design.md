# Design: update-connector-keenable

Decision record for the Keenable ranking pass. The original connector
decisions (D1–D5) in `add-connector-keenable/design.md` still hold;
this file records only what this change adds.

## D6 — Fetch `live` defaults to true

Indexed fetch and live fetch cost one Keenable credit (D4, drill
2026-09-28). The vendor default is `live=false`: a URL missing from
the index is an HTTP error, which Monid counts as a provider error.
Once fetch volume crosses the public head-to-head threshold, that
default would put Keenable last on "Read a web page" the same way ten
errors already put it last on "Search the web".

The vendor OpenAPI (docs.keenable.ai, verified 2026-11-03) types
`live` as boolean, default false. There is no `live: "auto"` (indexed
copy, then live on a miss) — that is an API-side follow-up, the Exa
contents posture. Until it exists, the connector default at the
binding is `true`. Callers who want the indexed copy only pass
`live: false`.

Rejected: sending `live: "auto"` (vendor 400); leaving the vendor
default (every non-indexed URL is a provider error); a `toRequest`
that injects `live` without a schema default (agents would not see
the default in inspect).

## D7 — Categories and job-shaped presets

`news-search` and `web-extraction` already exist in
`connectors/categories.ts`. Search gains `news-search` so discover
can rank the general search doc for "search the news"; fetch gains
`web-extraction` for the prompt path.

Three additional docs share the vendor paths and pin `endpoint:`
(D22, the opoint `/search` posture):

- `keenable#v1/search-news` — `published_after` default `"2d"` at the
  binding (D25: defaults live at the binding, not the mirror).
- `keenable#v1/search-as-of` — `query_time` required. No other search
  endpoint on Monid documents point-in-time search.
- `keenable#v1/fetch-answer` — `prompt` required, `web-extraction`.

They inherit the same usage as the doc they wrap (search: PER_UNIT
RESULT, empty bills 0; fetch: PER_CALL 1). The evidence/estimate pair
is authored once in `schema/search-binding.ts` and interned.

Rejected: inventing a batch-fetch path the vendor does not serve;
adding a `lang` query parameter the vendor does not accept (the
duplicate-language caveat stays in the search description).

## D8 — Whitespace-only strings fail closed

A whitespace-only `query` passes `.min(1)` and becomes a vendor 400
(or a billed empty search). `.trim()` is a zod transform and does
not survive `z.toJSONSchema` (hunterio D7, surf reconcile). The
binding adds `.regex(/\S/)` on `query`, `site`, the date bounds,
`query_time`, and `prompt`. Engine validation is JSON Schema, so
this is the form that actually rejects `"   "` at INVALID_INPUT
before the wire call.
