# loyaltie-connector (delta)

## ADDED Requirements

### Requirement: Loyaltie provider definition
The loyaltie provider SHALL declare name `loyaltie`, `request.baseUrl`
`https://loyaltie.com`, headers `Accept: application/json` and
`MCP-Protocol-Version: 2025-11-25`, timeouts 30 s / 30 s, an empty
credential shape with a pass-through `inject`, and a FREE usage model.
Every endpoint SHALL POST to `/api/ucp/mcp`.

#### Scenario: A call is free
- **WHEN** any Loyaltie endpoint returns HTTP 200
- **THEN** usage is `{credits: {}, evidence: {}}`

#### Scenario: An HTTP error is data, zero usage
- **WHEN** the server answers non-2xx
- **THEN** the run completes with `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and the JSON-RPC envelope as output

### Requirement: Attributed tools/call
Each endpoint SHALL send `{jsonrpc: "2.0", id: 1, method: "tools/call",
params: {name, arguments}}`, where `arguments` is the caller's body plus
`src: "api"` and `agent_id: "monid"`, and SHALL return the tool's
`structuredContent` unchanged.

#### Scenario: Search sends its tool name and attribution
- **WHEN** `loyaltie#search-catalog` is called with a catalog query
- **THEN** the outgoing body names `search_catalog` and carries
  `src: "api"` and `agent_id: "monid"`
- **AND** the output equals the recorded `structuredContent`

### Requirement: Four endpoints with strict inputs
The connector SHALL provide `loyaltie#search-catalog`,
`loyaltie#get-product`, `loyaltie#get-maker` and
`loyaltie#build-cart-link`, all in the `shopping` category.

#### Scenario: Invalid inputs fail before the wire
- **WHEN** search is called with `pagination.limit: 0`, get-product with
  `catalog.id: ""`, get-maker with `maker.id: ""`, or build-cart-link
  with a line item `quantity: 0`
- **THEN** the run fails INVALID_INPUT

#### Scenario: A tool-level error is returned as data
- **WHEN** get-product is called with an unknown id
- **THEN** the server answers HTTP 200 and the output's `messages`
  carries `code: "not_found"`
