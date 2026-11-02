# Proposal: add-connector-stophy

## Why

[Stophy](https://stophy.dev) gives agents the live web: one API to search
the web, read what people say, and look up products, places, jobs and
homes. Its 137 endpoints are synchronous `POST`s with strict JSON bodies
under one bearer key, priced per call from a prepaid balance
(https://docs.stophy.dev/billing: $1.50 per 1,000 calls, $1.20 from $100,
$0.80 from $500), and a call that fails or finds nothing costs nothing.
Submitted by the vendor. This first wave adds the endpoints agents reach
for most across search, news, social, video and places.

## What Changes

- **connectors/stophy** — provider (`presets.auth.bearer()` on
  `https://api.stophy.dev/v1`) + 8 endpoints: `google/search`,
  `google/news`, `reddit/search`, `youtube/transcript`,
  `youtube/comments`, `google/maps/search`, `google/maps/reviews`,
  `x/profile`.
- **Billing** — one `default` pool labelled "Stophy calls". List
  endpoints are leaf `PER_UNIT`, counted 1 only when `data.results` is
  non-empty (Stophy bills an empty answer nothing). `youtube/transcript`
  and `x/profile` are leaf `PER_CALL` (a miss is a vendor non-2xx).
  `google/search` is COMPOSITE: 1 for a call with results plus 1 per
  result that came back with its page text (`markdown`) when
  `scrapeResults` is on; the binding carries the vendor defaults
  (`scrapeResults` false, `scrapeLimit` 3) so the estimate reads the real
  knob.
- **Vendor meter** — every Stophy response carries `creditsUsed`. The
  provider-level `usage.consolidate` plucks it out of the payload; a
  non-zero value is the vendor's claim and wins (D27), a zero is omitted
  so the derived fold decides.
- **Inputs** — faithful mirrors of the vendor's endpoint catalog
  (https://api.stophy.dev/v1/endpoints), `.strict()` like the vendor's
  `additionalProperties: false`. The vendor's "send one, not both" pairs
  (`videoUrl`/`videoId`, `placeUrl`/`placeId`, `profileUrl`/`username`,
  and `query`/`topic` on news) are enforced at the binding as a union of
  two strict arms.
- **Errors** — provider-level `output.fromError` reads
  `$.error.message` from Stophy's `{success: false, error: {...}}`
  envelope.
- **Fixtures** — provider-level chains with `{{request.url}}` bindings:
  one recorded happy path per endpoint and a recorded 401. The happy
  paths were recorded on Stophy's keyless tier, so they carry
  `creditsUsed: 0` and exercise the derived fold. Two synthetic chains
  cover an empty answer and `google/search` with pages read (non-zero
  meter). Reviewer and commenter identity fields are placeholders.
- **ids.lock.json** — the 8 new ids.

## Capabilities

- `stophy-connector`.

## Non-goals

- The other 129 Stophy endpoints (shopping, jobs, real estate, ad
  libraries, more social sites). They follow in a second wave, recorded
  with a test key the vendor will provide.
- Endpoints priced per 10 results or per second of audio, and the
  page-read family (`web/scrape`, `web/crawl`, `web/batch`) whose price
  depends on how hard a page is to reach — they need their own models.

## Impact

New connector tree only; no schema/engine/compiler changes — version
stays.
