# Design: add-connector-brightdata

Decision record. Everything here was settled against the published OpenAPI
plus live drills on a real key, 2026-09-23.

## D1 — The zone is credential material, not caller input

Every call to `POST /request` must name a `zone`: the account-side object
that says which product the request runs as, which geos it may egress from,
and what its output defaults are. The vendor marks it REQUIRED.

It cannot be a caller argument. A zone name resolves only inside the account
that holds the key, so a caller who is not the key-holder has no way to know
one, and a wrong name is a flat 400 (`zone "x" not found` — drilled). It is
also not a secret: it is a name, and it appears in the vendor's own docs.

So it travels WITH the key, as a second and third credential field, and never
reaches the caller-facing schema:

```
auth.credentials = { apiKey, serpZone, unlockerZone }
```

Alternatives rejected:

1. **Expose `zone` on the body.** Faithful to the mirror, unusable in
   practice — the caller would have to guess a name from someone else's
   account, and every wrong guess is a billable-looking 400.
2. **One `zone` credential field, caller picks the product.** Collapses the
   two products into one endpoint and makes the endpoint's own meaning
   depend on a credential value. `discover` ranks on `meta.description`; an
   endpoint whose description must say "search engine results, or any URL,
   depending on how your key is configured" ranks for nothing.
3. **Derive the zone from a `GET /zone/get_active_zones` probe at run time.**
   An extra round trip on every call, an IO-doing auth fn (which the closed-
   term contract forbids), and a silent behavior change the first time an
   account grows a second zone of the same type.

The cost of D1, stated plainly: this is the first credential object to carry
a non-secret, and hosted configuration now has three fields to set per
account rather than one. `BRIGHTDATA_CREDENTIALS_SERP_ZONE` and
`BRIGHTDATA_CREDENTIALS_UNLOCKER_ZONE` follow the standard derivation with no
special case, and the live-test gate reads the field list off the shape
(`BRIGHTDATA_KEYS`) so it cannot drift.

## D2 — Two products on one wire path, told apart by declared id

SERP API and Web Unlocker API are the same endpoint. Same host, same method,
same path, same body — the zone type is the whole difference, and sending a
SERP zone to an unblocker call (or the reverse) is a 400.

Ids are derived from `endpoint ?? request.path`, so both would land on
`brightdata#request` and collide. Both therefore DECLARE `endpoint` (`/serp`,
`/unlocker`) — the contactout work/personal precedent, for the same reason:
the request alone cannot tell the two apart.

The body mirror splits the same way. `connectors/brightdata/schema/
request-body.ts` carries what both products document (`url`, `format`,
`method`, `country`, `data_format`); the Web Unlocker mirror adds `render`
and `debug`, which Bright Data publishes for that product alone. The SERP
mirror overrides only the `url` DESCRIPTION — the field an agent is most
likely to get wrong, because it must be a search-engine url carrying the
query, and because `brd_json=1` is what turns the page from markup into
fields.

The two `auth.inject` sources differ (`serpZone` vs `unlockerZone`), so they
intern to two fnTable entries rather than one. That is the honest outcome:
the field they read is the product switch.

## D3 — No vendor meter, so no `usage.consolidate`

Drilled live against a real key, both products, both formats: a successful
response is the fetched payload and nothing else. No credits field, no cost
field, no usage envelope. The only usage-shaped surface Bright Data exposes
on a request is `x-brd-debug`, opt-in via `debug: true`.

`x-brd-debug` is not read as a claim. It is documented as a debugging aid
rather than a billing receipt, it is opt-in (so a claim would exist only when
the caller happened to ask for it), and it is a HEADER — `record` drops
headers outside a four-entry allowlist, so no fixture could ever pin it and
no replay test could guard it.

Consequence, eyes open: there is no `usage.mismatch.derived` cross-check for
Bright Data. The derived fold IS the bill, and the pinned rate is guarded by
`test:live` plus the literal assertions in the replay tests — the contactout
D2 / clay D7a posture. Bright Data publishes no machine-readable pricing
surface either, so no `scripts/drift/` suite is added.

## D4 — The envelope is the billing signal, and it already agrees with the engine

Bright Data bills per SUCCESSFUL request. The question a connector has to
answer is which responses those are, and here the envelope says it exactly:

| case | envelope | billed | drilled |
| --- | --- | --- | --- |
| unlock performed, target 200 | 200 | yes | `format` raw and json |
| unlock performed, target 404 | **200**, target status in `x-brd-status-code` | yes | both formats |
| zone not found | 400, body `zone "x" not found` | no | live |
| rejected key | 401, body `Invalid token` | no | live |

The target's status is never the envelope's. A page that 404s is an unlock
Bright Data performed and charges for, and it answers 200 — verified in BOTH
formats, which matters because it would have been reasonable to expect `raw`
to pass the target's status through and it does not.

So the engine's rule ("vendor non-2xx is DATA, zero usage") and the vendor's
rule ("pay only for success") are the same partition, and no usage line has
to reconcile them. `unlocker-target-404.json` is the fixture that pins it:
`isProviderError` false, `{CALL: 1}`, billed.

A caller who needs to branch on the target's status sends `format: "json"`,
which lifts it into the body as `status_code`. Both endpoint descriptions
say so.

## D5 — Errors are bare strings, and pass through untouched

Bright Data rejects a request with a plain-text body — `Invalid token`,
`zone "x" not found` — not a JSON envelope. The engine's sniffing decode
renders a non-JSON body as the complete raw body, faithfully, and a string IS
Json; the HTTP status already flags it as a provider error and zero-bills it.

No `output.fromError`. Digesting a one-line string into `{message}` would add
a shape without adding information, and would then have to guess at a
structure for the several error strings not yet seen.

## D6 — Flat per-request billing, pinned from the published card

Both products are priced per REQUEST, not per result and not per byte:
$1.50 per 1,000 requests pay-as-you-go (`brightdata.com/pricing/serp` and
`/pricing/web-unlocker`, read 2026-09-23) — $0.0015 a call.

That makes each endpoint a LEAF `PER_CALL`, and there is nothing to author:
the compiler synthesizes the one lawful empty counts fn for a flat model and
the engine appends the flat 1 under `CALL`. No estimate fn, no evidence fn,
no metered line.

The pool is US DOLLARS. Bright Data publishes no credit unit — it prices in
dollars directly — so unlike Firecrawl there is no vendor-native unit to
carry, and the dollar rate is the vendor's own number rather than a
conversion (the exa posture).

Known tier concern, stated rather than modeled: the $499/month Scale plan
bills $1.30 per 1,000 above its included allowance, and an enterprise
contract prices separately. Volume pricing is an account fact, not a request
fact — nothing in the request says which tier settles it — so the doc pins
the published pay-as-you-go rate and re-audit on repricing is the guard, the
same trade apify makes with its Business-tier pins.

Free tier, for completeness: 5,000 free requests a month, SHARED across Web
Unlocker API, SERP API, Web Scraper API and Scraper Studio, no card. It is an account-level allowance with no request-level signal, so it is
not modeled either — a call under it settles at the pinned rate and the
allowance is the account's business.
