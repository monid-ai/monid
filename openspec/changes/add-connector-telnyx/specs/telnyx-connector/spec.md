# telnyx-connector (delta)

## ADDED Requirements

### Requirement: One Search endpoint
The provider SHALL use `presets.auth.bearer()`, default apiKey credentials,
`https://api.telnyx.com/v2`, request/run budgets of 30 seconds, a default US-dollar
credit pool and no consolidate hook. Exactly `telnyx#web_search` SHALL be added.

#### Scenario: Compiled catalog
- WHEN the catalog is compiled
- THEN the Telnyx endpoint set is exactly `["telnyx#web_search"]`
- AND its method is POST, URL is `https://api.telnyx.com/v2/web_search`, category
  is `web-search`

### Requirement: One-unit search billing with strict evidence
The endpoint SHALL consume 0.005 default credits per RESULT unit, estimate
one, and settle one for a nonempty `data.results.web` array or zero for an
empty array. Source: https://telnyx.com/products/web-search-api FAQ,
"$5 per 1,000 calls", checked 2026-10-22. Telnyx prices per call; an empty
search is still an upstream call, which the buyer is not billed for (Monid
absorbs it, search1api #40 posture).

#### Scenario: Any positive result count
- WHEN a successful response contains 1, 3, 10 or 100 web results
- THEN usage is `{credits:{default:0.005},evidence:{RESULT:1}}`
- AND result cap does not multiply the charge or truncate the returned payload

#### Scenario: Genuine empty array
- WHEN the successful response has `data.results.web: []`
- THEN usage is `{credits:{},evidence:{RESULT:0}}`
- AND the upstream Telnyx call is not passed through to the buyer

#### Scenario: Missing or malformed success meter
- WHEN a 2xx response is malformed JSON, empty/null, missing data/results/web,
  or contains a non-array web value
- THEN the native strict JSON reader fails with FN_CONTRACT, not a zero-cost
  successful result and not a guessed provider HTTP status
- AND no completed settlement is returned

### Requirement: Native errors and transport
Non-2xx bodies SHALL remain data with `isProviderError:true` and
`{credits:{},evidence:{}}`. JSON is sniff-decoded; invalid JSON stays raw text,
and an empty body becomes null. This sync connector SHALL add no POST retry.

#### Scenario: 429 with Retry-After, 5xx or redirect
- WHEN the native transport returns the synthetic error response
- THEN it makes one request, returns the error body and zero usage
- AND no automatic backoff/retry or redirect-following occurs

#### Scenario: Network failure or native request timeout
- WHEN the transport throws or its native 30-second timer aborts the fetch
- THEN the engine rejects with EXECUTION_FAILED, retriable=true
- AND no completed usage is returned and no automatic replay is attempted

#### Scenario: Caller cancellation (shared engine behavior)
- WHEN the local synchronous runner receives an aborted caller signal
- THEN the shared engine may still send, complete and settle the request
- AND this connector neither works around nor changes that engine behavior

### Requirement: Faithful input and output boundaries
Body SHALL be strict: query 1–2000 characters, count integer 1–100, country
length 2, safesearch off/moderate/strict, freshness string up to 20 characters,
include/exclude arrays up to 50 strings, livecrawl boolean. No defaults SHALL
be injected. Unknown body keys SHALL fail before transport. Cross-field
include/exclude mutual exclusion SHALL remain vendor-enforced.

#### Scenario: Input gates are neither too wide nor too narrow
- WHEN count is 101, country has length 3, or domain array has 51 items
- THEN INVALID_INPUT is returned before transport
- AND count 100, two-character country and 50-item arrays pass
- AND arbitrary two-character countries, free-form freshness and string domain
  entries are not mislabeled as ISO/URL-validated inputs

#### Scenario: URLs in query/filter data
- WHEN input strings contain arbitrary URLs
- THEN local egress remains on the compiled api.telnyx.com Search endpoint
- AND redirects are manual; no provider-side crawl SSRF guarantee is inferred

#### Scenario: Optional response data
- WHEN a response contains optional news/images, including synthetic null values
- THEN the payload is passed through unchanged
- AND only the web array's presence/type/cardinality drives Search metering;
  individual item schemas are not asserted by this connector
