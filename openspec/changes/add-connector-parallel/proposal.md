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

## Capabilities

- `parallel-connector`.

## Non-goals

Paid REST APIs, authentication, connection-level overrides, persistent MCP
connections, server-initiated requests, SSE reconnection and agent orchestration.

## Impact

Connector-only change. Existing defaults, engine, schema and ABI are unchanged.
