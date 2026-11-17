# Proposal: add-connector-everyday

## Why

Everyday MCP provides anonymous, stateless household calculations through a
public MCP Streamable HTTP endpoint. Three deterministic operations fit the
Monid catalog as separate endpoints: unit conversion, exact-fraction recipe
scaling, and compatible-unit shopping-list merging. The service requires no
account, API key, or paid credits.

## What Changes

- Add provider `everyday`, personally maintained by Shuai, with homepage
  `https://alfie.family`, documentation
  `https://alfie.family/agent-guide.html`, explicit empty credentials, an
  unchanged-request auth injector, and a FREE usage model.
- Add three explicit catalog identities over the shared
  `POST https://everyday.alfie.family/mcp` transport:
  - `everyday#unit-convert` calls MCP tool `unit_convert`.
  - `everyday#recipe-scale` calls `everyday_calculate` action
    `recipe_scale`.
  - `everyday#shopping-merge` calls `everyday_calculate` action
    `shopping_merge`.
- Pin MCP 2026-07-28 headers and request metadata. Callers provide only the
  operation's arguments; connector hooks own the JSON-RPC method, tool name,
  action, headers, and metadata.
- Lift HTTP-200 JSON-RPC errors, MCP `isError` results, and malformed MCP
  success envelopes to provider errors while retaining the original envelope.
  Successful responses expose `result.structuredContent`.
- Add a `utility` leaf category because the existing closed vocabulary has no
  accurate leaf for deterministic household calculations.

## Capabilities

- `everyday-connector`.

## Non-goals

- Everyday's timer, feedback (`ask_for`), time, calendar, bill, and expanded
  calculator operations.
- Current price, inventory, weather, or other live-data lookup.
- Storing an input history for these three calculations.
- Any connector-engine, schema ABI, or hosted discovery/run change.

## Impact

New connector and OpenSpec trees, one category leaf, and three entries in the
endpoint identity lock. No engine version or configuration change.
