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
RESULT at $0.001, empty bills 0; fetch: PER_CALL $0.001). The
evidence/estimate pair is authored once in `schema/search-binding.ts`
and interned.

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

## D9 — Pin the volume rate in USD

Keenable's native meter is still one vendor credit per search or
fetch. The published prices are in dollars (keenable.ai/pricing,
2026-11-03):

| Plan | Rate | Who it is for |
|---|---|---|
| Pay as you go (Builder) | $4 / 1,000 = $0.004 | Agent builders after the 100k free month |
| Dedicated capacity (volume) | $1 / 1,000 = $0.001 | AI labs / inference at 100+ RPS |
| x402 | $0.01 | Keyless wallet pay-per-call |

Monid's hosted card used the Builder rate, so agents saw
`keenable /v1/search` at $0.004 next to TinyFish at $0.00. The
broker's `$ / credit` row is the one fact the schema leaves outside
the doc (`consumes.ts`: card keyed by `(provider, creditId)`). A
credit-pool connector cannot change that row.

Vendors whose list prices are dollars pin them in the doc instead —
Exa (`US dollars`, $0.007 + $0.001/extra), Apify, OpenAI, DataForSEO.
That is an authoring decision, not a hosted commercial one. This
connector does the same at the volume rate:

- pool label `US dollars`
- PER_CALL / PER_UNIT draw `0.001`
- empty `results: []` still bills 0

How that sits next to the other search endpoints on Monid (a typical
10-result search, vendor-published or hosted-guide numbers):

| Endpoint | What the doc pins | ~$ for 10 results |
|---|---|---|
| TinyFish `/search` | FREE | $0.00 |
| Context.dev `/web/search` | 1 credit / 10 results | $0.00253 |
| **Keenable** (this change) | **$0.001 / call, up to 50 results** | **$0.001** |
| Octen `/search` | 1 Octen credit (~$0.001 list) | $0.001 |
| Surf `/search/web` | 1 Surf credit | $0.006 |
| Exa `/search` | $0.007 + $0.001/result above 10 | $0.007 |
| Keenable previously on Monid | 1 credit × Builder $0.004 | $0.004 |

Rejected: leaving the pool as "Keenable credits" and drawing 0.25
(that would lie about vendor credits); pinning $0.004 (Builder —
Monid's aggregate traffic is volume); `UsageModelKind.FREE` (each
call would count 0.2 in the rankings).

The 100,000-request free plan still does not carry over: Monid
calls use Monid's upstream key. Going fully free on Monid remains a
hosted allowance question.
