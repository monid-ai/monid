# Design: add-connector-frankki

Decision record for the FrankKi connector (new; not a v1 port). The input
schemas mirror the vendor lane's Zod schemas (`quoteInput`, `address`,
`composeInput` without `attachmentIds`, `previewInput`, `checkoutInput`,
`trackInput`). Precedent by shape: sync POST + body, so exa.

## D1: One key, pooled tenancy without a resource

Monid calls with one FrankKi-issued key for every workspace. The vendor
lane was built for that: every read is addressed by a private token that
only the run which created it received (`draftToken`, `trackingToken`), no
endpoint lists rows, and the lane strips cost and carrier fields before
replying. So no `resources` binding or ownership gate is needed; the token
IS the ownership proof. Identity is the authored `endpoint` path, equal to
`request.path` on every doc.

## D2: FREE, the letter is paid off-platform

No call costs Monid anything. `checkout` returns a Stripe checkout URL on
FrankKi's own account; the user authorizes the amount there, FrankKi
captures when the carrier has the letter and releases the hold if its
content review rejects it. So the model is `FREE` at provider level, the
same declaration tinyfish uses, and there is no `usage.consolidate`: no
response carries a meter. Rejected: PER_CALL with a nominal amount (it
would bill the buyer twice for one letter).

## D3: Provider-level envelope unwrap that keeps non-success 2xx whole

Every response is `{status, code, message?, data, requestId}`. exa needs no
`fromResponse` because its body is the payload; here the payload is
`data`, so one provider-level `fromResponse` returns it when `status` is
`success`. The one 2xx that is NOT a success is checkout's
`202 CONTENT_REVIEW_PENDING`, a borderline letter a person reviews within
36 hours. The engine treats 2xx as success, so the hook relays that body
whole: dropping the envelope would hide the code the agent must report.
Billing cannot be affected either way (FREE). `fromError` maps the same
envelope to `{message, code, raw}`, the litescrape shape.

## D4: Per-endpoint timeouts over the provider default

Provider timeouts are 30 s / 35 s. Compose and checkout render a PDF (and
checkout also creates a Stripe session), measured 4-7 s in production but
bounded higher (45 s / 50 s); quote and the lookups are lower. Same
construct as tinyfish's per-endpoint `timeouts`.

## D5: Fixtures

Recorded 2026-10-27 against production with `deno task record`: a happy
chain and a 401 (wrong `X-FrankKi-Lane-Key`) per endpoint. Private tokens,
signed page URLs and the checkout handle were replaced with placeholders;
replay matches method and URL, so the placeholders do not affect matching.
The happy letter used test addresses and was never paid, which is why
`track` answers `not_found`. `synthetic-review-pending` (202) and
`synthetic-content-rejected` (422) use the production envelope; recording
them needs a letter that trips the vendor's content screen.
