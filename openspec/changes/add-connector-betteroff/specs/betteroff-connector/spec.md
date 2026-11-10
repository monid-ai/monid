# BetterOff connector requirements

## ADDED Requirements

### Requirement: All 29 fixed endpoints

The connector SHALL expose the 29 current tools: 21 reads and eight writes, matching the BetterOff catalog retrieved October 25, 2026. It SHALL NOT expose apply, approve, sign, or execution routes. Each SHALL send a fixed `tools/call` request to BetterOff's existing `/mcp` endpoint with JSON-RPC version `2.0`, ID `1`, and protocol header `2025-03-26`.

#### Scenario: A caller reads cash flow

- **WHEN** a caller supplies valid start and end dates and a transport-resolved credential
- **THEN** the request calls only `betteroff_get_cash_flow` with those dates
- **AND** the credential appears only in the outgoing authorization header

### Requirement: Household credentials stay outside input

The connector SHALL require a nonempty transport-resolved `accessToken`. Input schemas SHALL reject unknown body fields, including household and user selectors, connection IDs, access and refresh tokens, client secrets, and arbitrary tool names. BetterOff SHALL remain responsible for household identity and scope enforcement.

#### Scenario: An input attempts to change identity

- **WHEN** a body includes `householdId`, `accessToken`, or an arbitrary tool `name`
- **THEN** validation fails with `INVALID_INPUT` before a network call
- **AND** the corresponding body without that field passes input validation

#### Scenario: The credential is absent or empty

- **WHEN** the credential resolver supplies no valid `accessToken`
- **THEN** credential validation fails before a network call

### Requirement: Cash-flow dates mirror BetterOff

Both date fields SHALL be required nullable ISO calendar dates. Null start SHALL mean the beginning of the household's current month, and null end SHALL mean today in that time zone. BetterOff SHALL enforce date ordering and its 366-day limit.

#### Scenario: Calendar validation

- **WHEN** the caller supplies February 30 or omits a required nullable date field
- **THEN** input validation fails before transport
- **AND** a valid calendar date or explicit null in the same field passes

#### Scenario: An invalid date range reaches BetterOff

- **WHEN** a syntactically valid range runs backward or exceeds 366 days
- **THEN** the connector permits BetterOff to validate the range
- **AND** BetterOff's tool error remains a provider error with zero usage

### Requirement: Successful results have endpoint-specific shapes

The connector SHALL validate the version 4 envelope and each endpoint's required data fields. Financial success data SHALL follow each endpoint's object or array schema. Feedback SHALL return a version 4 receipt. New financial tools SHALL require both revision fields; the original three MAY accept pre-revision v4 results. Additional fields SHALL remain intact. Decimal strings, numeric contract values, nulls, quality, dates, evidence, warnings, and pagination SHALL pass through without conversion.

#### Scenario: A partial recurring result

- **WHEN** BetterOff returns known and unknown stream amounts with partial quality
- **THEN** the connector preserves the streams, nullable amounts, quality reasons, evidence, and warnings
- **AND** usage is `{credits: {}, evidence: {}}`

#### Scenario: Unavailable recurring data

- **WHEN** a valid result has unavailable quality, zero counts, and an empty stream list
- **THEN** it remains a successful result with the source limitations intact

#### Scenario: Malformed success data

- **WHEN** a successful envelope contains null cash-flow data, a nondecimal money string, or a missing required result field
- **THEN** the engine rejects it with `CONTRACT_VIOLATION`
- **AND** the connector does not return it as a successful financial result

### Requirement: Provider failures remain inspectable

HTTP failures, JSON-RPC errors, MCP tool errors, and invalid JSON-RPC wrappers SHALL remain provider errors with zero usage. The original error body SHALL remain available. When the connector replaces a successful upstream HTTP status with an error status, it SHALL preserve `providerHttpStatus`.

#### Scenario: An HTTP 200 tool failure

- **WHEN** BetterOff returns `isError: true` or structured `ok: false` inside HTTP 200
- **THEN** the connector returns HTTP 502, `providerHttpStatus: 200`, and `isProviderError: true`
- **AND** it preserves the original body and settles zero usage

#### Scenario: Rate limiting or invalid protocol framing

- **WHEN** BetterOff returns HTTP 429
- **THEN** the connector preserves HTTP 429 and the body with zero usage
- **WHEN** an HTTP 200 response has the wrong JSON-RPC ID/version or is unexpected event-stream text
- **THEN** the connector returns a provider error instead of financial data

### Requirement: Validation evidence has a defined scope

Replay tests SHALL run compiled sealed units without network access. Fixtures SHALL be synthetic and contain no real household records, credentials, or request headers. Live tests SHALL be gated on `liveSkip("betteroff", ["accessToken"])` and assert shape without logging financial records.

#### Scenario: No live credential is configured

- **WHEN** `BETTEROFF_CREDENTIALS_ACCESS_TOKEN` is absent
- **THEN** all three live tests skip and replay tests remain runnable

### Requirement: Hosted publication requires verified user isolation

Hosted publication SHALL require verified caller-to-household credential binding, OAuth acquisition and refresh, expiry and revocation behavior, scope enforcement, financial-result handling, and offer pricing. Passing local tests SHALL NOT establish these hosted properties.

#### Scenario: Two callers connect different households

- **WHEN** hosted validation runs with two unrelated Monid callers and two BetterOff households
- **THEN** each caller reads only its own authorized household
- **AND** a shared household token is not used for unrelated callers

### Requirement: Every tool requires Core entitlement

All 29 tools SHALL document BetterOff Core and their tool-specific scopes as separate prerequisites. Paid, complimentary, and payment-grace Core access qualify; Free and trials do not. FREE SHALL describe zero per-call provider usage, not plan eligibility or hosted pricing. BetterOff SHALL remain responsible for checking current entitlement.

#### Scenario: A household lacks Core

- **WHEN** BetterOff returns HTTP 403 carrying `AGENT_SUBSCRIPTION_INACTIVE` for any tool
- **THEN** the connector preserves HTTP 403 and the original denial body
- **AND** a legacy HTTP 200 failed MCP result still maps to 502 with `providerHttpStatus: 200`
- **AND** it preserves the error code, retryability, and recovery instructions with zero usage
- **AND** it does not turn the denial into an empty successful result

### Requirement: The host selects private OAuth credentials

Hosted execution SHALL bind credential selection to an authenticated principal and private connection. Workspace membership alone SHALL NOT authorize another principal's connection. Refresh tokens and client secrets SHALL stay outside the connector. Missing or denied connections SHALL fail before provider egress without a shared credential fallback.

#### Scenario: Concurrent callers in one workspace

- **WHEN** two calls use independently bound host resolvers for different synthetic households
- **THEN** each compiled endpoint receives only its caller's synthetic household response
- **AND** credentials are absent from serialized run results
- **AND** this local test SHALL NOT be represented as verification of Monid's hosted ownership checks

#### Scenario: A loaded endpoint loses its connection

- **WHEN** the host resolver refuses a disconnected connection on the next dispatch
- **THEN** the loaded endpoint fails without another provider request
- **AND** previously resolved credentials are not reused by the direct transport

#### Scenario: Provider authorization is temporarily unavailable

- **WHEN** BetterOff returns HTTP 503 with `AGENT_AUTHZ_UNAVAILABLE` or `AGENT_AUTH_UNAVAILABLE`
- **THEN** the status and code remain distinct from grant revocation
- **AND** the connector makes no automatic retry and returns no successful financial data

#### Scenario: Scope or policy denies the read

- **WHEN** BetterOff refuses an invalid token, insufficient scope, revoked grant, lost ownership, missing consent, or pending account deletion
- **THEN** the connector preserves the provider status and structured denial body with zero usage
- **AND** refresh, reconnect, and scope escalation remain host decisions

### Requirement: State-writing tools do not bypass BetterOff approval

Proposals and financial requests SHALL preserve review links, pending status, terms, and source limitations. The connector SHALL make only the named MCP call and SHALL NOT follow the link or approve, apply, sign, or execute. Cancellation SHALL be described as an immediate state change, and provider refusal SHALL remain an error. Feedback SHALL require `userApproved: true`; the host SHALL obtain actual consent.

#### Scenario: An outside agent prepares a transfer

- **WHEN** a wallet or vault request omits its idempotency key
- **THEN** input validation fails before credential lookup or network access
- **WHEN** the user authorizes retrying the same request with its original key
- **THEN** the connector forwards that key unchanged and makes one request per invocation
- **AND** local forwarding tests do not establish provider deduplication

#### Scenario: Bank discovery and preparation

- **WHEN** bank-transfer input is empty
- **THEN** the connector permits eligible-account discovery
- **WHEN** input contains creation fields
- **THEN** source, destination, amount, and idempotency key are all required
- **AND** partial creation input fails before transport

#### Scenario: Feedback consent is missing

- **WHEN** approval is absent or false
- **THEN** validation fails before credential lookup or egress
- **AND** a true flag SHALL NOT be represented as proof that the host obtained human consent

#### Scenario: Hosted mutation support is not established

- **WHEN** local compiled tests pass for all 29 tools
- **THEN** hosted caller credential selection, OAuth refresh/disconnect coordination, saved-result privacy, and write confirmation behavior remain unverified
- **AND** financial approval and signing remain in BetterOff
