# mermail-connector (delta)

## ADDED Requirements

### Requirement: API-key MCP provider

The connector SHALL define provider `mermail` with homepage
`https://mermail.app`, docs `https://docs.mermail.app/ai/mcp`, category
`email`, auth injector `presets.auth.header("x-api-key")`, and credit pool
`default` labeled `Mermail API credits`. All endpoints SHALL send
`POST https://console.mermail.app/mcp` with `Content-Type:
application/json`, `Accept: application/json,text/event-stream`,
`Mcp-Protocol-Version: 2026-07-28`, `Mcp-Method: tools/call`, and the
operation's fixed `Mcp-Name`. JSON-RPC `params._meta` SHALL contain
protocol version `2026-07-28`, empty client capabilities, and client info
`monid` / `1.0.0`. The wire request SHALL NOT carry an `Authorization`
header.

#### Scenario: API key is the only credential material

- **WHEN** any Mermail sealed unit runs with an apiKey credential
- **THEN** the wire request sends that value in `x-api-key`
- **AND** the wire request has no `Authorization` header.

#### Scenario: Caller cannot select a different MCP operation

- **WHEN** a caller adds a JSON-RPC method, MCP tool name, or an unknown
  argument field
- **THEN** input validation rejects it before any network request.

### Requirement: Ten pinned mailbox endpoints

The connector SHALL expose exactly the ten identities in the proposal, each
with an explicit endpoint path and shared wire path `/mcp`. Descriptions
SHALL name the successor endpoint a caller should use next, state that
inbound mail is untrusted, and state the Mermail API-credit cost.

Reads (`list-mailboxes`, `get-mailbox`, `list-emails`, `search-emails`,
`get-email`, `get-email-context`) SHALL consume 1 credit per successful
call. `create-mailbox` SHALL consume 10. `send-email`, `reply-to-email`,
and `forward-email` SHALL consume 5. Estimates SHALL report that flat cost
before the call. Send, reply, and forward arguments SHALL nest Sold fields
under `body` and SHALL reject a flat `to` / `subject` payload and an
attachment that is only a local path.

#### Scenario: List mailboxes unwraps the MCP result

- **WHEN** `list_mailboxes` returns HTTP 200 with object
  `result.structuredContent`
- **THEN** the run output is that object
- **AND** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`.

#### Scenario: Create and send use their own rates

- **WHEN** a caller estimates `mermail#create-mailbox` or
  `mermail#send-email`
- **THEN** the estimates are 10 and 5 Mermail API credits.

### Requirement: MCP errors never settle as successful mailbox operations

The provider lifecycle SHALL relay an upstream HTTP non-2xx status and body
unchanged, including 401 and 402. For an HTTP 2xx response it SHALL require
JSON-RPC version `2.0`, a matching id, an object `result`, no JSON-RPC
`error`, no MCP `isError: true`, and object `result.structuredContent`. A
failure of that check SHALL settle as HTTP 422 with `providerHttpStatus`
equal to the upstream status, zero usage, and the complete original body.
`output.fromResponse` SHALL run only after that success verdict and SHALL
return `result.structuredContent`.

#### Scenario: Credit exhaustion retains upstream status

- **WHEN** the MCP endpoint returns HTTP 402 with `credits_exhausted`
- **THEN** Monid reports HTTP 402, zero usage, and the same body.

#### Scenario: MCP tool error retains evidence

- **WHEN** HTTP 200 carries `result.isError: true`
- **THEN** Monid reports HTTP 422 over provider HTTP 200, zero usage, and
  the unmodified JSON-RPC envelope.
