# Design: add-connector-readme-score

## D1 — A keyless provider: empty credentials, pass-through inject

README Score has no API key. The compiler requires `auth.inject` to resolve
(`endpoint ?? provider`), and the only presets are `header` and `bearer`, both
of which read `data.params.apiKey`. So the provider declares
`credentials: z.object({})` and `inject: ({ data }) => data.request`, which
returns the request as built; there is no secret to inject and none to leak.
Every endpoint is `UsageModelKind.FREE`, so no credit system is declared.

Rejected: a dummy `apiKey` the service ignores (it would make every caller set
an env variable for nothing); a new `presets.auth.none` (an engine/shared
change, which a connector-only PR must not carry, and the pass-through lambda
is already a closed term the linter accepts).

Consequence for tests: `liveSkip("readme-score", [])` is always true, because
it opens only when every declared credential field is set. The live tests are
gated on `README_SCORE_LIVE=1` instead.

## D2 — The Markdown endpoint has no provider-error fixture

`/api/score/markdown` answers 400 only for a missing or non-string `readme`,
which the input schema (`readme` required, non-empty string) rejects as
INVALID_INPUT before any request is made. The only errors reachable with valid
input are platform ones (an oversized body is refused by the host with an empty
502/503/429), which carry no vendor body to pin. A recorded error fixture would
have to be invented, so the endpoint has the happy and schema-gate tests only.
The repository endpoint does have one: a real 404 for an unknown repository.
