# Proposal: add-connector-sellmycompanydata

## Why

Sell My Company Data (sellmycompanydata.com) works out an indicative range for
what a company's operational records (chat, CRM, support, docs, code, email,
projects, finance) could be worth when licensed for AI training and
evaluation, from summary figures only. Agents can already call it over its
public, keyless MCP server. This change makes its two read-only tools
discoverable through Monid, as a no-cost option.

## What Changes

- **connectors/sellmycompanydata**: two endpoints over one MCP Streamable
  HTTP POST (`https://sellmycompanydata.com/mcp`), each pinning one
  `tools/call` name in its own `input.toRequest`:
  - `#assessment-checklist` calls `assessment_checklist`. The tool takes no
    arguments, so the endpoint declares no input schema and always sends
    `arguments: {}`; nothing a caller sends reaches the wire.
  - `#estimate-data-value` calls `estimate_data_value`. Its arguments mirror
    the server's published `tools/list` inputSchema (server v1.1.0, read
    2026-10-29), strict at both levels as the server publishes them, with
    optionality only and no defaults.
  - **Read-only.** The server's third tool, `request_offer`, is not ported:
    it submits the owner's contact details to a human team and sends email
    and Slack notifications. The server's one prompt is not ported either.
  - **Keyless.** The server takes no credential. The provider declares an
    empty credential shape (`z.object({})`) and an identity `auth.inject`
    (`({ data }) => data.request`), as the pending salesbook connector does.
    A test pins the egress: URL, `POST`, three headers, the pinned body.
  - **FREE.** Provider-level `UsageModelKind.FREE`: no credit pool, no
    consolidate, compiler-synthesized quantities.
  - **Envelope.** Streamable HTTP answers failures with HTTP 200. A
    provider `lifecycle.start` lifts JSON-RPC errors, `isError: true` tool
    results and malformed or mismatched-id envelopes to a synthesized 422
    (`providerHttpStatus` keeps the real status), so they settle at zero.
    `output.fromError` digests them to `{ message, code?, raw }`. A success
    returns `result.structuredContent`. Same pattern as the pending mermail
    connector.
  - **One presentation change.** The estimate's `next_step` tells the agent
    to call `request_offer`, which is not here. The endpoint's
    `output.fromResponse` replaces that one field with a pointer to
    `estimate_url`. Every other field passes through; a test pins that.
  - **Timeouts** 15 s request / 20 s run (observed under 0.4 s).
- **Fixtures**: four recorded from the public server on 2026-10-29 (made-up
  figures, no personal data, no headers kept): the checklist, a qualifying
  estimate, a below-bar estimate and an in-band refusal (a founding year in
  the future). They were captured with curl rather than `deno task record`;
  a test asserts each recorded request body is exactly the one the
  connector sends.
- **ids.lock.json**: the two new ids.
- **Category**: `funding-data` (existing leaf: valuations and deal
  activity).

## Capabilities

- `sellmycompanydata-connector`.

## Non-goals

- No engine, schema, preset, category or test-tooling change;
  `ENGINE_VERSION` untouched.
- No MCP session handling. The server is stateless and answers `tools/call`
  without `initialize`.

## Impact

New connector tree, two ids in `connectors/ids.lock.json`,
`openspec/changes/add-connector-sellmycompanydata`. No contract change.
