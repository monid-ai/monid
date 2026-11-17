# Proposal: add-connector-parallel

## Why

Add anonymous web search and page extraction through Parallel Search MCP,
using the existing lifecycle HTTP port. No vendor API key is needed.

## What Changes

- Add `parallel#search` and `parallel#fetch`, both FREE, with faithful MCP
  tool inputs and no credential fields.
- Initialize a Streamable HTTP session per run, notify initialized, invoke
  the selected tool, and terminate the session best-effort.
- Return structured tool results, preserving MCP errors as provider errors.
- Add compiled-artifact tests, observed request assertions and recorded fixtures.
- Extend the shared fixture recorder to preserve MCP session headers during
  execution and redact them before saving, in a separate prerequisite commit
  documented in [D1](design.md#d1-preserve-mcp-sessions-during-recording-and-redact-them-before-persistence).

## Capabilities

- `parallel-connector`.

## Non-goals

Paid REST APIs, authentication, connection-level overrides, persistent MCP
connections, server-initiated requests, SSE reconnection and agent orchestration.

## Impact

Adds the Parallel connector and shared test-infrastructure support for recorded
MCP sessions. The fixture response-header allowlist accepts `mcp-session-id`;
saved fixtures replace its live value with `fixture-session`. Existing connector
defaults, engine behavior, endpoint document format and hook ABI are unchanged.
