# valyu-connector (delta)

## ADDED Requirements

### Requirement: Valyu provider and synchronous endpoints
The provider SHALL use `https://api.valyu.ai`, header `x-api-key`, and the
standard `apiKey` credential convention. It SHALL expose `valyu#v1/search`
and `valyu#v1/contents` through POST JSON requests, without an engine change.

#### Scenario: Authenticated Search request
- **WHEN** a valid Search body is executed
- **THEN** one POST goes to `https://api.valyu.ai/v1/search`
- **AND** the engine injects `x-api-key`, not Bearer authorization
- **AND** source metadata and result content remain in the output.

### Requirement: Faithful request mirrors and synchronous Contents binding
Search SHALL expose standard result caps, source/date/country filters, result
length, instructions, and historical-cache controls. Contents SHALL accept
1–10 HTTP/HTTPS URLs, optional summary processing, screenshots, extraction
effort, response length, and a total-dollar budget. The synchronous binding
SHALL reject `async: true`, `webhook_url`, and unknown fields.

#### Scenario: Historical search
- **WHEN** Search supplies `historical_cache: true` and ISO date-time bounds
- **THEN** the compiled input gate accepts the request.

#### Scenario: Async guard
- **WHEN** Contents supplies `async: true` or `webhook_url`
- **THEN** the request fails INVALID_INPUT before transport execution.

### Requirement: Dollar-denominated actual usage
Both endpoints SHALL use one US-dollar pool. Present vendor total-cost receipts,
including zero, SHALL take precedence over result-price fallback. Top-level
receipt fields SHALL be removed without modifying nested content or prices.
Evidence SHALL be integer nanodollars at $0.000000001 per unit.

#### Scenario: Fractional search receipt
- **WHEN** Search returns `total_deduction_dollars: 0.0075`
- **THEN** usage is `{credits: {default: 0.0075}, evidence: {CREDIT: 7500000}}`
- **AND** the receipt is removed from output, while per-result prices remain.

#### Scenario: Zero receipt
- **WHEN** a response explicitly reports zero total cost with nonzero prices
- **THEN** credits are empty, evidence CREDIT is zero, and prices are not summed.

#### Scenario: Missing receipt
- **WHEN** a successful response omits its total cost receipt
- **THEN** explicit result prices are summed
- **AND** failed Contents results contribute no cost.

### Requirement: Honest estimates and provider errors
Search SHALL return an empty pre-run estimate, documented as unavailable rather
than free or spend-capped. Its CPM `max_price` SHALL NOT be interpreted as total
dollars. Contents SHALL estimate its published $0.001 extraction rate per unique
URL, plus $0.001 for enabled summary processing, assuming all URLs succeed.
HTTP provider errors SHALL settle zero usage.

#### Scenario: Contents duplicates and summaries
- **WHEN** three URLs include one duplicate and `summary: true`
- **THEN** the estimate is $0.004 for two unique URLs.

#### Scenario: Partial Contents response
- **WHEN** Contents returns HTTP 206 with one success, one failure, and $0.001 cost
- **THEN** the call succeeds, both result statuses remain, and usage is $0.001.

#### Scenario: All Contents URLs fail
- **WHEN** Contents returns HTTP 422
- **THEN** isProviderError is true, usage is empty, and the failure envelope remains.
