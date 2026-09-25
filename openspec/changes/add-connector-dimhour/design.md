# Design: add-connector-dimhour

Only the choices the port was FORCED to make. Everything not listed follows
the repo precedent for its shape (sync POST + body → exa). No engine, compiler, schema or hook change.

## D1 — In-body MCP failures classified in a provider `lifecycle.start`

An MCP server reports failure inside an HTTP 200: a top-level JSON-RPC
`error`, or `result.isError: true`. The engine decides a provider error only
from `httpStatus`, and no pure hook can change it. The provider therefore
owns one `lifecycle.start` that makes the endpoint's own single request
through `utils.request()` and only classifies the answer. A 2xx with no
usable JSON settles as a 502 with `providerHttpStatus` kept, so the
engine zero-bills it. Usable means a non-null `structuredContent` object
or array, or else `content[0].text` that parses to a non-null JSON object or
array; arrays pass in both paths, by the same non-null object check.
`start` never returns RUNNING.

This is the hunterio `email-verifier` posture, applied provider-wide
because every Dim Hour tool shares the envelope. Rejected: a new pure
"classify" hook in the engine, a framework change for one connector.

## D2 — The live tests gate on `DIMHOUR_LIVE=1`, not `liveSkip`

Dim Hour's public reads need no credential; the optional `apiKey` only lifts
the anonymous daily cap. `liveSkip("dimhour")` skips unless
`DIMHOUR_API_KEY` is set, so under it the live tests would never run
credentialless — the one mode the connector promises. Each
`endpoint.test.ts` live case instead uses `ignore: liveOff()`
(`connectors/dimhour/testing.ts`), which runs only when `DIMHOUR_LIVE=1` is
set explicitly. It stays opt-in (a plain `deno task test` never touches the
network) and needs no secret. Nine calls in all, each asking for at most 2
results.

## D3 — Shared test helpers in `connectors/dimhour/testing.ts`

The nine endpoints share one wire shape (`POST /mcp`, JSON-RPC
`tools/call`) and one error classification (D1). Their `endpoint.test.ts`
files import the wire-capture run, the envelope and error assertions, the
no-IO estimate engine and the live gate from one test-only module instead
of repeating them nine times. Each file still states its own tool name,
input, fixture, schema-gate cases and live shape check. The compiler reads
only `provider.ts` and `endpoints/<e>/endpoint.ts`, so this module never
reaches a doc; the compiled catalog is unchanged by it.
