# Design: add-connector-citable

## D1 — A keyless provider: empty credentials, pass-through inject

Citable has no API key. The compiler requires `auth.inject` to resolve
(`endpoint ?? provider`), and the only presets are `header` and `bearer`, both
of which read `data.params.apiKey`. So the provider declares
`credentials: z.object({})` and `inject: ({ data }) => data.request`, which
returns the request as built; there is no secret to inject and none to leak.
Every endpoint is `UsageModelKind.FREE`, so no credit system is declared.

Rejected: a dummy `apiKey` the service ignores (it would make every caller set
an env variable for nothing); a new `presets.auth.none` (an engine/shared
change, which a connector-only PR must not carry, and the pass-through lambda
is already a closed term the linter accepts).

Consequence for tests: `liveSkip("citable", [])` is always true, because it
opens only when every declared credential field is set. The live test is gated
on `CITABLE_LIVE=1` instead.
