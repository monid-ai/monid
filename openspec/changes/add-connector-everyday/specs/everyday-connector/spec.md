# everyday-connector (delta)

## ADDED Requirements

### Requirement: Anonymous FREE provider over MCP Streamable HTTP

The connector SHALL define provider `everyday`, personally maintained by
Shuai, with homepage `https://alfie.family`, docs
`https://alfie.family/agent-guide.html`, category `utility`, explicit empty
credentials, an auth injector that returns the request unchanged, and
`UsageModelKind.FREE` with no credit systems. All endpoints SHALL send
`POST https://everyday.alfie.family/mcp` with `Content-Type:
application/json`, `Accept: application/json,text/event-stream`,
`Mcp-Protocol-Version: 2026-07-28`, `Mcp-Method: tools/call`, and the operation's
fixed `Mcp-Name`. JSON-RPC `params._meta` SHALL contain protocol version
`2026-07-28` and empty client capabilities.

#### Scenario: Anonymous call has no credential material

- **WHEN** any Everyday sealed unit runs with an empty credential resolver
- **THEN** its compiled credential schema has no properties or required fields
- **AND** the wire request has no `Authorization` header
- **AND** the successful run reports `{credits: {}, evidence: {}}`.

#### Scenario: Caller cannot select a different MCP operation

- **WHEN** a caller adds a JSON-RPC method, MCP tool name, action, or an
  unknown input field
- **THEN** input validation rejects it before any network request.

### Requirement: Three fixed deterministic endpoints

The connector SHALL expose exactly `everyday#unit-convert`,
`everyday#recipe-scale`, and `everyday#shopping-merge`, using explicit endpoint
paths `/unit-convert`, `/recipe-scale`, and `/shopping-merge` while sharing the
wire path `/mcp`. Their descriptions SHALL state that outputs are deterministic
from explicit inputs, no current price or weather lookup occurs, no input
history is stored for these three operations, and neither `timer` nor `ask_for`
is called.

`unit-convert` SHALL call `unit_convert` with the validated body as arguments
and SHALL mirror all ten source dimensions: length, mass, temperature, area,
volume, speed, pressure, energy, power, and data size. Units from another
dimension SHALL fail local schema validation.

`recipe-scale` SHALL call `everyday_calculate` with a connector-owned
`request.action` of `recipe_scale`. Its body SHALL mirror serving strings,
1-200 strict ingredients, optional notes up to 500 characters, and optional
instructions up to 20,000 characters. `shopping-merge` SHALL similarly pin
`shopping_merge`, accept 1-500 strict ingredients, and allow the source MCP's
mass, volume, and count target units. The schema files SHALL add no defaults or
refinement hooks. Rational positivity/validity, non-whitespace names, and total
request byte limits SHALL remain upstream checks documented in endpoint notes.

#### Scenario: Exact recipe data is lossless

- **WHEN** a recipe scales a `1/2` quantity from 3 to 5 servings with a note
  and multiline instructions
- **THEN** the structured result returns canonical quantity `5/6`
- **AND** the note and instructions are unchanged.

#### Scenario: Workflow consumes actual first-step ingredients

- **WHEN** a test projects name, canonical quantity, unit, and optional note
  from the recipe result into shopping merge
- **THEN** the second wire request carries that projection rather than a
  hard-coded replacement
- **AND** the merged item retains quantity `5/6`.

#### Scenario: Upstream-only rational validation remains visible

- **WHEN** recipe scale receives `fromServings: "0"` or shopping merge
  receives quantity `"1/0"`
- **THEN** the local JSON Schema permits the string-shaped request to reach
  Everyday
- **AND** Everyday's MCP `isError` result settles as a Monid provider error
  with zero usage and the original response envelope.

### Requirement: MCP errors never settle as successful calculations

The provider lifecycle SHALL relay an upstream HTTP non-2xx status and body
unchanged. For an HTTP 2xx response it SHALL require JSON-RPC version `2.0`, a
matching id, an object `result`, no JSON-RPC `error`, no MCP `isError: true`,
and object `result.structuredContent`. A JSON-RPC error, MCP tool error, id or
version mismatch, missing result, or missing/non-object structured content
SHALL settle as HTTP 422 with `providerHttpStatus` equal to the upstream status,
zero usage, and the complete original body. `output.fromResponse` SHALL run
only after that success verdict and SHALL return `result.structuredContent`;
the endpoint output schema SHALL validate that unwrapped object.

#### Scenario: HTTP rate limit retains upstream status

- **WHEN** the MCP endpoint returns HTTP 429 with an error body
- **THEN** Monid reports HTTP 429, zero usage, and the same body.

#### Scenario: JSON-RPC error retains evidence

- **WHEN** HTTP 200 carries a JSON-RPC `error`
- **THEN** Monid reports HTTP 422 over provider HTTP 200, zero usage, and the
  unmodified JSON-RPC envelope.

#### Scenario: Malformed success is rejected

- **WHEN** HTTP 200 omits `result` or carries non-object
  `result.structuredContent`
- **THEN** Monid reports HTTP 422 over provider HTTP 200 and preserves the
  original body.

#### Scenario: Structured output still enforces its contract

- **WHEN** a protocol-valid success carries an object structured result that
  omits a required operation output field
- **THEN** the run fails output contract validation rather than returning a
  partial success.
