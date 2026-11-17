# Parallel connector

## ADDED Requirements

### Requirement: Anonymous search and fetch

The catalog SHALL expose `parallel#search` and `parallel#fetch` through
`https://search.parallel.ai/mcp`, without credential fields or auth headers.
Both endpoints SHALL use the FREE usage model.

#### Scenario: User selects search

- **WHEN** the caller supplies an objective and related search queries
- **THEN** the connector invokes `web_search` and returns its structured results.

#### Scenario: User selects fetch

- **WHEN** the caller supplies up to 20 HTTP/HTTPS URLs
- **THEN** the connector invokes `web_fetch` and returns results and per-URL errors.

### Requirement: MCP protocol and errors

Each run SHALL initialize the supported protocol, propagate the session header
when provided, send the initialized notification, and invoke the selected tool.
All requests SHALL identify Monid with a project User-Agent. The connector SHALL
accept JSON and finite SSE POST responses and match JSON-RPC reply IDs.
HTTP failures, JSON-RPC errors, tool errors and malformed replies SHALL become
provider errors with zero usage. Session termination SHALL be best-effort and
SHALL NOT replace the tool outcome. Per-request timeouts SHALL remain bounded.

#### Scenario: Tool failure

- **WHEN** a 200 reply contains `isError: true` or a JSON-RPC error
- **THEN** the run reports a provider error rather than successful search output.

#### Scenario: Rate limited

- **WHEN** a protocol request returns 429
- **THEN** the run returns the provider failure without automatic retries.
