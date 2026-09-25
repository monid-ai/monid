# dimhour-connector (delta)

## ADDED Requirements

### Requirement: Dim Hour provider definition
The dimhour provider SHALL declare name `dimhour`, display name `Dim Hour`,
homepage `https://dimhour.com`, docs `https://dimhour.com/mcp.html`,
category `maps`, `request.baseUrl` `https://mcp.dimhour.com`, request headers
`content-type: application/json` and
`accept: application/json, text/event-stream`, and timeouts 15 s request /
20 s run (live calls measured 0.1-2.1 s on 2026-09-24).

#### Scenario: Provider compiles into the catalog
- **WHEN** `deno task catalog endpoints --provider dimhour` runs
- **THEN** it lists exactly nine endpoints, each in category `maps`

### Requirement: Stable public identities over one shared MCP path
Every dimhour endpoint SHALL send `POST https://mcp.dimhour.com/mcp` and
SHALL declare its own `endpoint` identity, so the nine compile to the
distinct ids `dimhour#list-cities`, `dimhour#search-venues`,
`dimhour#get-venue`, `dimhour#list-new-venues`, `dimhour#list-curated`,
`dimhour#find-places`, `dimhour#get-hours`, `dimhour#search` and
`dimhour#fetch`, each recorded in `connectors/ids.lock.json`.

#### Scenario: One path, nine ids
- **WHEN** the compiled dimhour docs are read from the bundle
- **THEN** every `request.url` is `https://mcp.dimhour.com/mcp`, every method
  is POST, and the nine ids are unique and equal the list above

### Requirement: MCP request wrapping
Each endpoint's `input.toRequest` SHALL produce the body
`{jsonrpc: "2.0", id: 1, method: "tools/call", params: {name, arguments}}`
where `name` is the endpoint's FIXED MCP tool name and `arguments` is the
validated caller body (`{}` when the endpoint takes no input).

#### Scenario: The wire body per endpoint
- **WHEN** `dimhour#search-venues` runs with
  `{city: "dallas", query: "ramen", limit: 2}`
- **THEN** exactly one request is sent, to `POST /mcp`, whose body is the
  `tools/call` envelope with `name: "search_venues"` and those arguments
  unchanged

### Requirement: Output unwrapping
On success the output SHALL be `result.structuredContent` without the MCP
envelope. When `structuredContent` is absent, the output SHALL be the JSON
parsed from `result.content[0].text`. When both are present,
`structuredContent` SHALL win.

#### Scenario: Structured content is returned bare
- **WHEN** a call answers 200 with `result.structuredContent`
- **THEN** the output deep-equals `structuredContent` and carries no
  `jsonrpc`, `result` or `content` key

#### Scenario: Text fallback
- **WHEN** a call answers 200 with no `structuredContent` and valid JSON in
  `content[0].text`
- **THEN** the output is that parsed JSON and the run succeeds

#### Scenario: Structured content wins over differing text
- **WHEN** `structuredContent` is present and `content[0].text` is prose
- **THEN** the output is `structuredContent`

### Requirement: MCP error classification at zero usage
A provider-level `lifecycle.start` SHALL make the endpoint's own single
request through `utils.request()` and SHALL settle as a 502 provider error,
with `providerHttpStatus` the real status, when a 2xx answer carries a
JSON-RPC top-level `error`, a `result.isError === true`, or no usable JSON
(no `structuredContent` object and no JSON in `content[0].text`). Other
non-2xx answers SHALL settle with their own status. `start` SHALL NOT return
RUNNING. `output.fromError` SHALL return `{message, error_code?, raw}`.

#### Scenario: JSON-RPC top-level error
- **WHEN** any endpoint answers 200 with `error: {code: -32601,
  message: "Method not found"}`
- **THEN** the run is a provider error with httpStatus 502,
  providerHttpStatus 200, usage `{credits: {}, evidence: {}}`, and output
  message `Method not found` with `error_code` -32601

#### Scenario: Tool error
- **WHEN** any endpoint answers 200 with `result.isError: true` and the
  text `{"error": "Unknown city \"atlantis\"..."}`
- **THEN** the run is a zero-usage 502 provider error whose message is the
  tool's own error string

#### Scenario: Malformed text never passes as success
- **WHEN** a call answers 200 with no `structuredContent` and non-JSON text
- **THEN** the run is a zero-usage 502 provider error and the raw body is in
  the output

### Requirement: Faithful input schemas
Each endpoint's body schema SHALL mirror the live `tools/list`
`inputSchema` of its tool: the same fields, optionality, required fields,
bounds and enums, strict where the source declares
`additionalProperties: false`, and no defaults. Upper bounds on `limit`
SHALL be the source's own (25 for `search-venues` and `find-places`, 100
for `list-new-venues`).

#### Scenario: The source's validation holds before the wire
- **WHEN** `dimhour#search-venues` receives `limit: 26`, or
  `dimhour#get-venue` receives no `city`, or an endpoint that declares a
  body schema receives an unknown field
- **THEN** the run fails `INVALID_INPUT` and nothing is sent

#### Scenario: The source's bounds themselves pass
- **WHEN** an endpoint receives a value exactly at a source bound (`limit`
  25 on `search-venues` or `find-places`, `limit` 100 or `days` 90 on
  `list-new-venues`, `max_price` 4, `min_score` 100, or a `sort` inside the
  enum)
- **THEN** the input passes the gate

#### Scenario: An endpoint with no input declares no body schema
- **WHEN** `dimhour#list-cities`, whose live tool takes no input, receives
  a body
- **THEN** the body is not validated, and the request still carries
  `params.arguments: {}`

### Requirement: No new authentication requirement
Reads SHALL succeed with no credential configured. An OPTIONAL `apiKey`
SHALL travel as `x-api-key` only when one is configured.

#### Scenario: Bare read
- **WHEN** an endpoint runs with no credential params
- **THEN** the request carries neither `x-api-key` nor `authorization`

### Requirement: Billing gate
`usage.model` SHALL be `PER_CALL` drawing 1 from the `default` pool, whose
unit is one successful Dim Hour MCP call, declared in
`connectors/dimhour/rate-card.ts`. The doc SHALL NOT declare a money rate or
a `FREE` model until Dim Hour and Monid agree terms.

#### Scenario: Success bills one call, errors bill nothing
- **WHEN** any endpoint succeeds
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`, and the
  pre-run estimate is the same without any IO

### Requirement: Replay coverage without bulk traffic
Each endpoint SHALL have a replay test for its happy chain, its request
envelope, and both in-body error shapes. No test SHALL request more than 2
results. A live smoke SHALL run only when `DIMHOUR_LIVE=1` is set, with no
credential, one small request per endpoint.

#### Scenario: Bulk safety
- **WHEN** the test suite runs
- **THEN** every `limit` in the test inputs is at most 2
