# xquik-connector (delta)

## ADDED Requirements

### Requirement: Xquik provider definition

The xquik provider SHALL declare name `xquik`, `request.baseUrl`
`https://xquik.com/api/v1`, auth `presets.auth.header("x-api-key")`,
timeouts 120 s / 120 s, one credit pool `default` ("US dollars") and NO
`usage.consolidate`.

#### Scenario: A list read bills each returned row

- **WHEN** `GET /x/tweets/search` returns 200 with 2 tweets
- **THEN** usage is `{credits: {default: 0.0003}, evidence: {RESULT: 2}}`
- **AND** the payload keeps `tweets`, `has_next_page` and `next_cursor`

#### Scenario: A single read bills 1 call

- **WHEN** `GET /x/users/{id}` or `GET /x/tweets/{id}` returns 200
- **THEN** usage is `{credits: {default: 0.00015}, evidence: {CALL: 1}}`

#### Scenario: An error is data, zero usage

- **WHEN** an endpoint answers 400 or 404 with `{error, message}`
- **THEN** the run completes with `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and the vendor envelope passes through unchanged

### Requirement: Seven authenticated read endpoints

The connector SHALL provide `xquik#x/tweets/search`, `xquik#x/tweets/{id}`,
`xquik#x/users/search`, `xquik#x/users/{id}`, `xquik#x/users/{id}/tweets`,
`xquik#x/users/{id}/followers` and `xquik#x/users/{id}/following`, all in
the `twitter` category. Each `{id}` endpoint SHALL take `id` as a required
path parameter, and user search SHALL require `q`. Query schemas SHALL be
strict. A user lookup SHALL reject the bare IDs `search` and `batch`, and the
tweet lookup SHALL reject `search` and `top`.

#### Scenario: The page size is the estimate

- **WHEN** a list read is estimated with no page size
- **THEN** the estimate counts 20 rows for tweet search, user search and
  user tweets, and 200 profiles for followers and following

#### Scenario: Page sizes stop at 10,000

- **WHEN** search is called with `limit` 10001
- **THEN** the run fails INVALID_INPUT before any request

#### Scenario: An undeclared filter is refused

- **WHEN** search is called with `topic`, which Xquik prices above the read
  price
- **THEN** the run fails INVALID_INPUT before any request

#### Scenario: A reserved ID is refused

- **WHEN** `xquik#x/users/{id}` is called with `id` `search`
- **THEN** the run fails INVALID_INPUT, and `@search` passes
