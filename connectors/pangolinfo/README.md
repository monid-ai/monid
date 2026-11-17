# Pangolinfo Scraper API

Native connector for `https://scrapeapi.pangolinfo.com`, authenticated with
`Authorization: Bearer <key>`. API reference: <https://docs.pangolinfo.com>.

## Endpoints

| Endpoint ID (`pangolinfo#…`) | Native route                                   | Spend cap / price in Pangolinfo points                  |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `amazon/product`             | `POST /api/v1/scrape` (`amzProductDetail`)     | 1 per JSON page                                         |
| `amazon/search`              | `POST /api/v1/scrape` (`amzKeyword`)           | 1 per search page                                       |
| `amazon/bestsellers`         | `POST /api/v1/scrape` (`amzBestSellers`)       | 1 per ranking page                                      |
| `amazon/new-releases`        | `POST /api/v1/scrape` (`amzNewReleases`)       | 1 per ranking page                                      |
| `amazon/category`            | `POST /api/v1/scrape` (`amzProductOfCategory`) | 1 per listing page                                      |
| `amazon/seller`              | `POST /api/v1/scrape` (`amzProductOfSeller`)   | Explicit `pageCount` 1–3; 1 per successful page         |
| `amazon/offers`              | `POST /api/v1/scrape/follow-seller`            | 1 per offer page                                        |
| `amazon/reviews`             | `POST /api/v1/scrape` (`amzReviewV2`)          | Explicit `bizContext.pageCount` 1–10; 5 per billed page |
| `amazon/rufus`               | `POST /api/v2/scrape` (`amazonAlexa`)          | `param` contains 1–5 questions; 6 per answered turn     |
| `maps/local`                 | `POST /api/v3/extract/search/maps/local`       | Explicit `num` 1–100; 1.5 per request                   |

Prices are pinned on 2026-10-29 to the public
[JSON scrape rate](https://docs.pangolinfo.com/en-api-reference/amazonApi/submit),
[review rate](https://docs.pangolinfo.com/en-api-reference/amazonReviewAPI/amazonReviewAPI),
[Rufus rate](https://docs.pangolinfo.com/en-api-reference/amazonAlexaAPI/amazonAlexaAPI)
and
[Maps rate](https://docs.pangolinfo.com/en-api-reference/mapDataApi/mapDataAPI).
These match the provider's `ScrapeApiPrices` catalog. The pool is **Pangolinfo
points**, not dollars. Dollar conversion, provisioning and the hosted commercial
agreement are separate platform configuration.

Requests use the native API field names, not the MCP tool parameter aliases.
Each endpoint pins its parser and JSON format. General scraping, arbitrary
parsers, raw HTML, callbacks, and asynchronous task submission are excluded.
Rufus answers through its synchronous HTTP API, with a 270-second transport
budget; it does not need a polling lifecycle. Dedicated variant expansion and
Alexa Listing/discovery are deferred.

## Credentials and examples

### Hosted Monid onboarding

The Monid team should register its own dedicated Pangolinfo account through the
official portal: <https://tool.pangolinfo.com/>. Use an email address controlled
by Monid, obtain the account's permanent API Key after signing in, and fund the
account through Pangolinfo's official purchase flow. The contributor's test
credential is not a production credential to redistribute. A short-lived
dashboard/session token is unsuitable for unattended hosting.

If you encounter any issues registering your account or obtaining your API Key,
please contact Pangolinfo at
[hujie@pangolinfo.com](mailto:hujie@pangolinfo.com).

Configure that permanent key as `PANGOLINFO_CREDENTIALS_API_KEY` in Monid's
hosted credential store. Keys are provisioned by the portal and injected by the
engine; they are not included in this connector, its fixtures, a public PR or an
onboarding email. Confirm the account's point allowance, concurrency and access
to the listed endpoints before public activation.

This onboarding applies to the Monid operator. End users calling the hosted
connector continue to use their Monid credentials; they do not each need a
Pangolinfo account under this arrangement. Bring-your-own-key onboarding for
each end user is a separate platform capability and is not implemented here.

The proposed starting arrangement is an ordinary prepaid Pangolinfo account.
Monid's acceptance of that arrangement and its public USD rate card still need
confirmation. Native endpoint point consumption is defined above; USD-per-point
conversion depends on the purchased plan/commercial agreement.

### Local execution

With Deno 2 installed, set `PANGOLINFO_CREDENTIALS_API_KEY` in your process
environment (`PANGOLINFO_API_KEY` is also supported by the engine). Never commit
the key or include it in a fixture.

```sh
deno task engine:run 'pangolinfo#amazon/product' --body \
  '{"site":"amz_us","content":"B0B4NLGCH5"}'

deno task engine:run 'pangolinfo#amazon/search' --body \
  '{"url":"https://www.amazon.com/s?k=wireless+earbuds&page=2"}'

deno task engine:run 'pangolinfo#amazon/reviews' --body \
  '{"url":"https://www.amazon.com","bizContext":{"asin":"B0B4NLGCH5","pageCount":1,"filterByStar":"critical"}}'

deno task engine:run 'pangolinfo#amazon/rufus' --body \
  '{"site":"jp","param":["おすすめのUSB-C充電器は？"]}'

deno task engine:run 'pangolinfo#maps/local' --body \
  '{"q":"coffee","ll":"37.7822,-122.4642,13z","num":10}'
```

`bizContext.zipcode` optionally selects a delivery ZIP code matching the
marketplace country. Unsupported ZIP codes are rejected before transport. No
pagination is followed automatically. Category `content` accepts only a node ID
and exposes the first page. Seller `content` accepts only a seller ID;
`pageCount` requests the first N pages. Neither ID accepts a `?page=N` suffix.

## Billing and outcomes

The top-level `pointCost`, when present, is the provider's actual point debit.
The connector preserves the complete envelope (`code`, `message`, `pointCost`,
`data`) so a paid semantic result cannot be mistaken for an ordinary product
response. A positive receipt wins over the derived rate card, including
fractional or discounted debits. An explicit zero receipt yields zero derived
units as well: the engine otherwise prunes a zero vendor claim and falls back to
its fold.

HTTP 200 with `code != 0` and no positive receipt becomes a provider error, with
zero Monid usage. A positive receipt preserves a semantic result as a successful
transport so Monid can collect what Pangolinfo charged. This includes
no-other-sellers (9201), a missing ASIN (9204), and a redirect (9206). Do not
automatically retry these outcomes. Rufus refusal (9207) is unbilled and maps to
422; rephrase the question instead of retrying it unchanged. Malformed HTTP 200
envelopes without a numeric code fail as 502.

Where `pointCost` is omitted, the derived fallback is one standard/Maps page,
requested seller pages (the upper bound, because the combined result has no
per-page success markers), successful review page entries containing a results
array (capped by the request, including short or empty successful pages), or
answered Rufus turns. Rufus's explicit turn status wins; older turns without
status count only when content, products or follow-up questions are present.
Normal V1 responses report `pointCost`, making the seller fallback unnecessary
for determining the actual debit in normal operation. Seller evidence remains an
upper bound: a one-point receipt does not prove one page was delivered because
account discounts may apply. The engine exposes the derived upper bound in
`usage.mismatch.derived` when it differs from the receipt. Review page evidence
can disagree with the receipt on accounts billed for requested pages or
review-count-based units; the receipt wins.

No exchange rate or settlement arrangement is invented by the connector.

## Validation

```sh
deno task check
deno task test
deno task ids:check
deno fmt --check connectors/pangolinfo
deno lint connectors/pangolinfo
```

Each endpoint has an `endpoint.test.ts` that runs shared compiled-artifact wire
and replay cases from `testing.ts`, asserting the whole usage object and rates
against public sources. `provider.test.ts` covers paid/unpaid business codes,
zero/fractional receipts, sparse review pages, partial delivery, rejected
callback/parser overrides and spend caps. `synthetic-*.json` fixtures are
explicitly synthetic contract cases; they are not evidence of a live request. A
live product test is credential-gated.

Live smoke checks on 2026-10-29 recorded requests covering all ten endpoints.
Product, search, both rankings, category, seller and reviews returned `code=0`;
offers returned the billed `9201` empty-offer outcome; Maps returned local
business data and Rufus returned an answered turn. These are point-in-time
checks, not an uptime or market-coverage guarantee. Five provider-level fixtures
(`page-success`, `paid-empty`, `review-success`, `maps-success`,
`rufus-success`) come from those recorded responses, minimized without
fabricating values. The recorded page-success chain is shared across standard
page endpoints.

Local checks on 2026-10-29: repository typecheck and compile passed; the initial
full suite passed **1319 tests**, with **0 failures** and **222 credential-gated
cases ignored**. After review corrections, this connector's **34 offline tests
pass**, with its one credential-gated live test ignored. Its files pass format
and lint checks. The global `ids:check` still reports upstream drift (78
unregistered endpoint IDs and 7 missing/renamed identities). This change adds
only the ten Pangolinfo IDs, which match the compiled catalog exactly; unrelated
identities are preserved.
