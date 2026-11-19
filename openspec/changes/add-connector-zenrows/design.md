# Design — zenrows connector

Every rate and rule below was confirmed against `api.zenrows.com` while the
connector was written, not taken from the published card alone. Where the
two disagreed, the live answer won and the disagreement is recorded.

## D1 — One wire surface, two endpoint ids, both pinned

Both endpoints are `GET https://api.zenrows.com/v1/`. The id is otherwise
derived from the wire path, so the pair would derive the same empty id and
fail `zEndpointPath`. Each pins `endpoint:` explicitly (`/scrape`,
`/extract`), naming what the endpoint does rather than the transport,
because the id is what a caller reaches for.

The alternative was one endpoint with an `extract` switch. Rejected: the
two return different shapes (a page versus parsed fields), fail differently
(a page always exists, a prepared domain may not), and an agent choosing
between them is choosing between answers, not options.

## D2 — The claim arrives in a header, so lifecycle.start relays

`X-Request-Credits` is what Zenrows actually charged. Monid's pure hooks
never see response headers: `usage.consolidate` is handed a
`zEnvelopeData` with no header member, and headers live on the
`HttpResult` that only lifecycle hooks hold.

So the provider declares a sync `lifecycle.start` that calls
`utils.request()`, parses the header once and stashes it at
`state.data.creditsCharged`; `usage.consolidate` and `usage.evidence` read
it back. This is the ahrefs and cloro pattern, and it replaces declarative
execution for every endpoint under the provider, which is right here
because both are synchronous and neither polls.

The header is accepted only when its trimmed value is all digits and a safe
integer. `-1`, `1.5`, `1e3`, `0x5` and `9007199254740992` are all refused.

## D3 — The pool is the credit, not the dollar

Zenrows reports `X-Request-Cost` beside `X-Request-Credits`. The pool is
the credit because that is what a customer holds and tops up, while dollars
per credit vary by plan tier. A dollar pool would pin one tier into the doc
and go stale on the next repricing.

## D4 — The rate is an identity

`PER_UNIT` on `Unit.CREDIT`, `consumes: {credit: "default", amount: 1}`.
The engine's derived fold then equals the vendor's claim at every value, so
a run that billed what Zenrows says it billed carries no `usage.mismatch`.

Any other rate would restate Zenrows' own arithmetic in the doc and drift
silently the next time a configuration is reweighed. The connector does not
own the price; it reports it.

## D5 — The hold is the caller's configuration, not a flat ceiling

`usage.estimate` reads `js_render`, `premium_proxy` and `mode` off the
validated input and holds what the table prices that configuration at.
Every row was confirmed with a live request:

| input | credits |
| --- | --- |
| plain | 1 |
| `js_render` | 5 |
| `premium_proxy` | 10 |
| both | 25 |
| `mode=auto` | 1 to 25 (10 observed with `proxy_country`) |

`mode=auto` is the one configuration that cannot be priced ahead: Adaptive
Stealth Mode escalates per page at the vendor's discretion and the input
says nothing about where it stopped, so it holds the 25 ceiling and the
surplus is released at settle.

A flat 25 for every call was taken first and reversed. It is the same
number on the `mode=auto` path, where the ceiling is the only honest
answer, so it costs nothing there. It is wrong everywhere else, and most
wrong on the likeliest call an agent makes: a bare URL, no mode and no
flags, which draws exactly 1 credit and is deterministic. Reserving 25
against it is 25x, and a hold is admitted against a real balance, so an
oversized one fails runs the balance would have covered.

The objection to a mixed estimate, that being a price on some runs and a
ceiling on others is harder to reason about than always being a ceiling,
is a cost the connector's author pays once, while the 25x is paid by every
caller on every call.

## D6 — A missing meter falls back to the ceiling, never to zero

When no usable header arrives, `usage.evidence` reports 25 and
`usage.consolidate` omits the pool entry, so the engine settles on that
derived fold. `?? 0` would turn a stripped header into a free run and leave
the cost with whoever brokers it. Erring high is correctable; erring at
zero is a silent subsidy.

An explicit `0` is different and is kept: Zenrows charges nothing for some
answers, and a parsed zero is a claim like any other. The engine carries it
in the evidence and leaves the pool entry off, because nothing was spent.

Non-2xx responses settle at zero regardless: a fn cannot bill an error.

## D7 — Extract returns the fields and drops the page

`extract=auto` answers `{html, parsed}`, where `html` is the whole fetched
page. The recorded response for a product page carried 166,604 characters
of `html` beside 2,879 bytes of `parsed`: dropping it removes 98.3% of the
payload. A caller who wanted the page would have called `zenrows#scrape`.

A body with no `parsed` passes through whole, so a vendor shape change
fails visibly instead of silently emptying the output. The hook runs after
`usage.consolidate`, so presentation can never change a bill.

No `output.schema`: Zenrows parses each prepared domain into its own field
set, so there is no one shape to validate.

## D8 — Markdown by default, and `html` is this endpoint's own value

The vendor returns raw HTML when `response_type` is absent, and an agent
that omits the format and silently receives 160 KB of markup has wasted the
call. The binding defaults `response_type` to `markdown`.

`html` is added as the endpoint's own value: the API has no such value and
answers 400 for it, and omitting the parameter is how the page's own markup
is asked for. `input.toRequest` makes that one translation. It is also the
only value that permits `outputs`, which the API rejects beside a
`response_type`.

## D9 — Rules that compile away are not rules

The API enforces constraints across fields: `mode=auto` cannot be combined
with `js_render` or `premium_proxy`, and `proxy_country` needs one of those
behind it. All four combinations were confirmed as 400 REQS004.

None of them is enforced in the schema. A `.superRefine` would be the
obvious way to make the invalid pair unconstructable, but refinements do
not survive `z.toJSONSchema`, and every connector here that had one removed
it. So each rule is stated in the `.describe()` of the field it constrains,
which is where an agent composing a request reads it, and the vendor
answers a violation as error-as-data.

The same rule bit the `url` field, and that one was a hole rather than a
documentation choice. `z.url({protocol: /^https?$/})` restricts the scheme
in zod and compiles to a bare `{type: "string", format: "uri"}`, which is
an annotation rather than a constraint, so `ftp:`, `file:` and
`javascript:` URLs reached the wire. A replay test caught it by watching
one leave. `z.url().regex(/^https?:\/\//)` is not a refinement and reaches
the doc as a `pattern`, so it holds.

The lesson generalises: in this repo, a constraint that does not appear in
the compiled JSON Schema is documentation, and must be written as
documentation or rewritten in a form that survives.

## D10 — Fixtures are recordings

All five were captured from `api.zenrows.com`. The policy paid for itself
on the first capture: the hand-written markdown body it replaced described
a version of `example.com` that no longer exists, so the authored fixture
was testing a page that had changed under it.

The extract fixture keeps `parsed` verbatim and elides `html` to one line.
The point of the fixture is that `fromResponse` drops it, and a 166 KB
fixture would trip the fixture-size lint.

One correction the recordings forced: an unprepared domain answers 403
REQS007 with `reason: domain_not_prepared`, as the published docs and the
gateway's own `RefusalReason` say. A local stack had answered 400 REQS004,
which is its preflight failing open when the parser is not wired, and was
nearly written into the connector as fact.
