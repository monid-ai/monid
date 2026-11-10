# Pangolinfo connector

## Requirement: native bounded requests

The connector SHALL authenticate requests to `scrapeapi.pangolinfo.com` with
Bearer auth and expose ten endpoints using the provider's native field names.
JSON parsers SHALL be pinned to their endpoint. Callback and arbitrary parser
fields SHALL be rejected before transport. Review and seller page counts and
Maps result limits SHALL be explicit input caps.

### Scenario: valid product request

- GIVEN `site=amz_us` and `content=B0B4NLGCH5`
- WHEN `pangolinfo#amazon/product` runs
- THEN exactly one POST is made to `/api/v1/scrape` with
  `parserName=amzProductDetail`, `format=json` and Bearer auth.

## Requirement: actual debit before presentation

The connector SHALL preserve the response envelope and read its top-level
`pointCost` for actual usage. Positive vendor claims SHALL win over estimates.
Zero vendor receipts SHALL also suppress the derived usage fallback. The
connector SHALL NOT convert points to dollars.

### Scenario: paid missing product

- GIVEN HTTP 200 with `code=9204` and `pointCost=1`
- THEN the result retains code/message/data and settles one point.

### Scenario: zero-cost successful response

- GIVEN HTTP 200 with `code=0` and `pointCost=0`
- THEN derived usage and settled usage both remain zero.

### Scenario: partial review delivery

- GIVEN a request capped at three review pages
- AND a response containing one delivered page and `pointCost=5`
- THEN the estimate is 15 points and the settled charge is 5 points.

### Scenario: short review pages without a receipt

- GIVEN a request capped at three pages and no pointCost receipt
- AND two successful data.json page entries with short results arrays
- THEN evidence records two pages and usage settles ten points, regardless of row count.

### Scenario: merged seller output has no delivered-page count

- GIVEN a request capped at three seller pages and a one-point receipt
- AND a merged response with no delivered-page count
- THEN usage evidence retains the request cap of three pages
- AND the receipt settles one point, with the derived upper bound exposed as a mismatch.

### Scenario: unsupported pagination fragments and search paths

- GIVEN a category or seller ID suffixed with ?page=N, or a product URL with /s in its query
- THEN input validation rejects the request before transport.

## Requirement: unbilled failures and Rufus outcomes

Non-2xx transport responses SHALL remain provider errors. HTTP 200 business
failures without a positive receipt SHALL be synthesized as provider errors
with zero usage. Missing numeric business codes SHALL fail closed. Rufus
answered turns SHALL be counted at six points each when no receipt is present;
refused/failed turns SHALL not count.

### Scenario: Rufus refusal

- GIVEN `code=9207` without a positive receipt
- THEN the connector returns provider status 422 with zero usage.

### Scenario: mixed Rufus turns

- GIVEN one answered turn and one refused turn, with no `pointCost`
- THEN the result settles 6 points.

## Requirement: reproducible validation

Tests SHALL execute compiled sealed units without network. Fixtures that were
not recorded against the provider SHALL use the `synthetic-` prefix. Credentials
SHALL NOT be committed. Stable endpoint IDs SHALL be registered in the lock.
