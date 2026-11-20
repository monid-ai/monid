# Design: add-connector-loyaltie

Decision record for the Loyaltie connector. Input schemas mirror the
MCP server's `inputSchema` per tool (tools/list, 2026-11-17).

## D1 — MCP `tools/call` over plain POST

The server is stateless (no `initialize` / session id required) and
answers `Accept: application/json` with a single JSON-RPC response, so a
sync endpoint can call it directly. `input.toRequest` wraps the caller's
arguments in `{jsonrpc: "2.0", id: 1, method: "tools/call", params:
{name, arguments}}`. A provider-level `output.fromResponse` returns the
tool's `structuredContent` (UCP-shaped), falling back to the parsed text
content; a JSON-RPC protocol error returns `{error}`.

## D2 — Keyless, FREE

No secret exists, so `auth.credentials` is the empty shape and `inject`
is a pass-through. The model is FREE: no credits, no evidence keys.

## D3 — Error classification

The server returns HTTP 400/406 for malformed JSON-RPC or a wrong Accept
header, and HTTP 200 with `result.isError: true` for tool-level errors
(for example `not_found`). The engine classifies by HTTP status, so a
tool-level error settles with `isProviderError: false`; its `messages`
array still carries the code. Flagging HTTP-200 tool errors would need
an engine-level hook and is out of scope here.

The provider-error fixtures are `synthetic-`: each pairs the endpoint's
own request with the HTTP 400 body the server returned on 2026-11-20 for
an unparseable body, since a valid request cannot be made to fail
on purpose.

## D4 — Live tests

The server is keyless, but `liveSkip` opens on credentials. The live
tests use `liveSkip("loyaltie")`, so they run when `LOYALTIE_API_KEY` is
set to any value (the key itself is never sent). They assert shape only.
