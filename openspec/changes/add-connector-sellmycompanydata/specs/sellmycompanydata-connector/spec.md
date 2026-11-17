# sellmycompanydata-connector (delta)

## ADDED Requirements

### Requirement: Keyless, free provider over one MCP endpoint

The sellmycompanydata provider SHALL declare name `sellmycompanydata`,
`request.baseUrl` `https://sellmycompanydata.com`, request headers `accept`
and `mcp-protocol-version`, an empty credential shape, an identity
`auth.inject`, timeouts 15 s request / 20 s run, and usage model `FREE`. It
SHALL NOT declare a credit pool or `usage.consolidate`.

#### Scenario: Nothing but the pinned call leaves the process

- **WHEN** any sellmycompanydata endpoint runs
- **THEN** exactly one `POST https://sellmycompanydata.com/mcp` is sent with
  `content-type`, `accept` and `mcp-protocol-version` only, no credential is
  resolved, and nothing is billed

### Requirement: Read-only surface, one pinned tool per endpoint

The connector SHALL expose exactly `sellmycompanydata#assessment-checklist`
and `sellmycompanydata#estimate-data-value`. Each SHALL send a JSON-RPC
`tools/call` whose tool name is fixed by the endpoint. No endpoint SHALL call
`request_offer`.

#### Scenario: The compiled bundle holds two reads

- **WHEN** the bundle is compiled
- **THEN** the `sellmycompanydata#` ids are exactly those two

#### Scenario: A caller cannot choose the tool

- **WHEN** a caller sends a tool name or extra keys
- **THEN** the estimate rejects them with `INVALID_INPUT` before any call,
  and the checklist sends `arguments: {}` regardless of input

### Requirement: In-band failures are zero-billed provider errors

A JSON-RPC `error`, a tool result with `isError: true`, or a success
envelope that is malformed or answers another request id SHALL settle as a
provider error at zero usage, with the server's own reason as `message` when
it gives one and the raw body under `raw`.

#### Scenario: The server's own input check refuses

- **WHEN** the server answers HTTP 200 with `isError: true`
- **THEN** `httpStatus` is 422, `providerHttpStatus` is 200, usage is
  `{credits: {}, evidence: {}}` and `message` is the server's text

### Requirement: Answers pass through, except one field

A success SHALL return `result.structuredContent` as the server sent it,
except that the estimate's `next_step` SHALL point at `estimate_url` instead
of the omitted `request_offer`.

#### Scenario: Recorded estimates replay field for field

- **WHEN** a recorded estimate replays
- **THEN** every field except `next_step` equals the recorded
  `structuredContent`

### Requirement: Bindings carry the server's published bounds

The estimate's input SHALL mirror the server's published schema, strict at
both levels, and reject what that schema rejects before any call.

#### Scenario: Out-of-bounds input never reaches the server

- **WHEN** a caller sends a missing required field, `employees` outside
  1-1,000,000, a `founded_year` before 1800, an unknown region, category or
  enum value, more than 30 systems, or an unknown key
- **THEN** the run fails with `INVALID_INPUT` and no upstream call is made
