# refetcher-connector (delta)

## ADDED Requirements

### Requirement: Eleven logical tools share the upstream API

The provider SHALL declare `refetcher` and API-key header authentication.
The catalog SHALL contain exactly these endpoint identities:

- `refetcher#instagram/post`
- `refetcher#instagram/profile`
- `refetcher#tiktok/video`
- `refetcher#tiktok/profile`
- `refetcher#facebook/post`
- `refetcher#facebook/profile`
- `refetcher#x/post`
- `refetcher#x/profile`
- `refetcher#youtube/video`
- `refetcher#youtube/channel`
- `refetcher#youtube/channel-videos`

The logical paths SHALL be declared explicitly; each compiled request SHALL
target `POST https://api.refetcher.com/`. Credentials SHALL be obtained through
the standard `REFETCHER_CREDENTIALS_API_KEY` environment convention, with the
existing `REFETCHER_API_KEY` compatibility alias, and injected as `X-API-Key`.

#### Scenario: Tool identity is separate from transport routing

- **WHEN** the eleven endpoint documents are compiled
- **THEN** their ids are distinct and all eleven use the same upstream POST URL
- **AND** no API-key value appears in a document or committed fixture

### Requirement: Every run has one target and a one-unit upper bound

Post/video tools SHALL accept one `url`, social profile tools one `username`,
and YouTube channel tools one `channelUrl`. Their bindings SHALL supply the
correct platform/resource discriminators and reject alternate target arrays.
Profile requests SHALL use exactly one page. YouTube channel tools SHALL cap
`recentVideosLimit` at twelve. The connector SHALL NOT follow cursors or
automatically request additional pages.

#### Scenario: A profile request remains bounded

- **WHEN** a caller requests recent posts from a social profile
- **THEN** the upstream body identifies one platform and username and one page
- **AND** a request for two pages fails validation before transport

#### Scenario: YouTube uploads fit one billing unit

- **WHEN** a caller selects channel videos with `recentVideosLimit: 12`
- **THEN** the request is accepted and the estimate is one successful unit
- **AND** a limit of thirteen fails validation before transport

#### Scenario: A batch cannot bypass the estimate

- **WHEN** a caller supplies `urls`, `usernames`, `profileUrls` or `channelUrls`
- **THEN** the input is rejected before transport

### Requirement: Only a successful result is billable

The provider SHALL declare a USD credit pool and a `PER_UNIT` result model
consuming 0.0009 USD per successful unit. Its pre-run estimate SHALL be one
unit. Settlement SHALL inspect the raw response before presentation and count
at most one successful result. It SHALL NOT use an unconditional `PER_CALL`
charge. Well-formed failed result objects and non-2xx responses SHALL
contribute no billable units. A missing or non-singleton `results` array, or
non-boolean result `success`, SHALL produce a contract error with no settled
usage; it SHALL NOT be silently treated as a valid zero-cost result.

#### Scenario: Successful singleton

- **WHEN** the API returns an HTTP 200 envelope containing the one successful
  target result
- **THEN** the run settles 0.0009 USD

#### Scenario: In-body target failure

- **WHEN** the API answers HTTP 200 with a target result whose `success` is false
- **THEN** the run settles zero USD

#### Scenario: HTTP provider error

- **WHEN** the upstream response status is 401, 402, 429 or 500
- **THEN** the engine reports a provider error with zero usage

#### Scenario: Malformed success envelope

- **WHEN** an HTTP 200 body lacks exactly one result with a boolean `success`
- **THEN** usage evidence fails with a contract error and no usage is settled

### Requirement: Output preserves the vendor's normalized data

The connector SHALL retain the response envelope and result metadata. It SHALL
preserve null metrics, availability states and returned pagination information
without treating missing public fields as zero. Documentation SHALL disclose
that returned CDN media URLs may expire and that a one-page tool does not
promise a complete profile history.

#### Scenario: Unavailable metrics and expiring media

- **WHEN** a successful result includes null metrics, availability markers and
  CDN links
- **THEN** these values remain unchanged in the caller's output

### Requirement: Test provenance and credential gating are explicit

Constructed fixtures SHALL have `synthetic-` names and descriptions disclosing
their provenance. Authenticated recordings SHALL be scrubbed before inclusion
and identified as recorded responses; four representative
`recorded-*-success.json` fixtures cover post, profile, channel and channel-video
response shapes. The separately recorded `unauthorized.json` fixture SHALL
identify the real unauthenticated HTTP 401 request. Fixtures SHALL contain no
API keys or private provider-account information.
Offline tests SHALL execute sealed compiled endpoints without network access.
Live tests SHALL require both a credential through the standard environment
convention and `REFETCHER_LIVE_INPUTS`, a JSON map of logical endpoint paths to
native request bodies; they SHALL skip if either is absent. Neither synthetic
fixtures nor the recorded authentication error SHALL be represented as proof
of successful live scraping.

#### Scenario: No API credential in CI

- **WHEN** the suite runs without a Refetcher API key or `REFETCHER_LIVE_INPUTS`
- **THEN** fixture-replay tests can run and live tests are skipped

#### Scenario: Recorded success coverage has a bounded validation claim

- **WHEN** the eleven tools are qualified through the compiled engine with
  one explicit public target per tool
- **THEN** validation reports each response status, result success and settled
  usage without retaining credentials
- **AND** the successful 2026-09-22 smoke run establishes those eleven cases
  at that time, not an SLA or universal target availability

### Requirement: Supplier operations remain outside the public tool catalog

The connector SHALL NOT expose account balance, billing administration,
payments, account provisioning or people search. It SHALL NOT embed
Refetcher's server implementation. The declared public rate SHALL NOT be
represented as a negotiated Monid supplier settlement or payout agreement.

#### Scenario: Catalog coverage is limited to public social-data tools

- **WHEN** the Refetcher catalog is inspected
- **THEN** it contains the eleven social tools and no supplier-account tool
