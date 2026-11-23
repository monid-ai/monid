# Proposal: add-connector-elfa

## Why

Elfa indexes social media and web pages, and turns them into high-intent events
and entities that an agent can query, or check a claim against:
analyzed events, storylines and arcs, trading calls with each caller's track
record, long/short positioning, mindshare, trending contracts, ranked
accounts, a market calendar, and the prediction markets its stories bear on.
Its public API fits the connector standard as is: one base URL,
one API-key header, synchronous JSON calls, and an exact per-call charge
reported on every response. Nothing needs a new engine capability.

It is also the first connector whose vendor dedups its own bill: a v3 list
endpoint charges a returned object only the first time the key is billed for it
within a window. The rate card is therefore an upper bound, and the vendor's
meter is the only exact source.

## What Changes

- **connectors/elfa**: 24 endpoints against `https://api.elfa.ai`, auth header
  `x-elfa-api-key`, one credit pool (`Elfa credits`).
  - v3 (16): `events`, `events/storylines`, `events/arcs`,
    `events/calendar`, `events/prediction-markets`, `entities`,
    `market/{crypto,equity}/call-book`, `market/{crypto,equity}/mindshare`,
    `market/crypto/trending-contracts`, `calls`, `calls/episodes`,
    `calls/positioning`, `people/accounts`, and `POST verify`.
  - v2 (8): `aggregations/trending-tokens`, `data/top-mentions`,
    `data/keyword-mentions`, `data/event-summary`, `data/trending-narratives`,
    `data/token-news`, `aggregations/trending-cas/{twitter,telegram}`.
  - Endpoint ids keep the version segment (`elfa#v3/events`), so the two
    generations never collide and an agent can tell them apart.
- **The vendor meter settles the bill.** A provider-level `lifecycle.start`
  relays two response headers into state: `x-elfa-credits` (the total charged)
  and `x-elfa-credits-detail` (`base=1;objects=9;dedup=3` or `base=5;window=5`).
  `usage.consolidate` claims `x-elfa-credits`. Evidence reads the detail where
  it exists, so the derived fold matches the meter, dedup included, and
  `usage.mismatch` stays quiet on normal traffic. Without the headers, evidence
  falls back to counting the response and the published card settles.
- **The published card is the model.**
  - Flat `PER_CALL`: every v2 endpoint at 1 credit, except `event-summary` and
    `trending-narratives` at 5; v3 `entities` 1, `events/prediction-markets` 1
    however many ids are sent, `positioning` 2, `verify` 1.
  - Base plus objects (COMPOSITE: `request` PER_CALL 1 + a `RESULT` line):
    `events` 1/event, `storylines` 2, `arcs` 2, `calendar` 1/entry, `calls` 1,
    `episodes` 2 per position. The estimate holds `ids.length` or `limit`, so it
    never under-holds.
  - Select-one bands by `limit` (COMPOSITE of `PAGE` lines, D19): call-book 2/4,
    mindshare 5/10, trending-contracts 5/10 plus a 5-credit `long_range` line
    when `to - from` exceeds 24 hours (Elfa allows 5 minutes of grace, so the
    line starts above 86,700 seconds), people/accounts 5/10 by standing or
    25/50 by track-record metrics.
  - Source: Elfa's pricing page, https://docs.elfa.ai/platform/pricing, and
    each endpoint's "Costs" line in the 3.15.0 OpenAPI, checked 2026-11-23.
- **Array params are comma-joined** in a provider `input.toRequest`, as akta
  and litescrape do. Elfa accepts both spellings, but repeated keys past 20
  values are not parsed as a list by its query parser.
- **Mirrors follow the runtime validators**, which are stricter than the
  published OpenAPI in places: v2 `timeWindow` pattern, at most five keywords,
  `page`/`pageSize`/`minMentions` at most 100; v3 ids are GUIDs, `entities.q` at
  most 128 characters, `eventType` filter without `spam`, `verify` text fields
  non-blank.
- **`x-elfa-credits` and `x-elfa-credits-detail` join `RECORDED_RES_HEADERS`**,
  so recorded fixtures carry the real meter.

## Capabilities

- `elfa-connector`.

## Non-goals

- v2 `chat`, `chat/stream` and `auto/*`: conversational or stateful, with a
  charge that depends on the model run. A later change can add them.
- v2 `account/smart-stats` (deprecated, scheduled for removal), `ping`,
  `key-status`, and the endpoints hidden from Elfa's published spec.
- v3 `key-status`, and `people/accounts/{handle}` (Enterprise only, not in the
  published spec).
- v3 `monitors`: stateful webhook subscriptions that deliver matches to a
  caller URL, not a per-call tool.
- x402 pay-per-request, on `/x402/v2` and on the GET `/v3` data routes
  themselves: the hosted platform holds an API key, and a keyed call never
  takes the x402 path.

## Impact

- New: `connectors/elfa/**`, `openspec/changes/add-connector-elfa/**`.
- Modified: `shared/testing/fixtures.ts` (two allowlisted headers),
  `connectors/ids.lock.json` (24 ids).
- No schema, compiler or engine change; no version bump.

## Billing notes for the platform

- The platform key must be on Elfa's PAYG plan, with auto top-up on. Free does
  not include `verify` (it answers 403). On a plan that is not charged per
  call, v2 reports `0` on the 1-credit endpoints and `4` on the 5-credit ones,
  and v3 reports list prices that were never charged.
- Dedup is per Elfa account. Every caller on the platform key shares it, so a
  caller can benefit from another caller's earlier read.
- v2 charges its 1-credit base on some non-2xx responses after authentication
  (`event-summary` and `trending-narratives` 503s, 429s, validation errors).
  The engine zero-bills every non-2xx, so the platform absorbs those.
  Field-level mirrors match Elfa's validators, and `v2/data/keyword-mentions`
  requires `keywords` or `accountName` as union arms. Its other cross-field
  rule (`from` and `to` 1 to 30 days apart) is stated in notes, so a caller who
  ignores it still costs one credit.
- `event-summary` and `trending-narratives` run language-model work and can take
  well over a minute on a cold cache; both carry 180 s timeouts.
- Elfa rate-limits per key (60 requests per minute by default); a platform key
  should be provisioned with a higher limit.
