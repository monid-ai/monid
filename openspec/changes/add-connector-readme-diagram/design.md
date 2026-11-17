# Design: add-connector-readme-diagram

## D1 — A keyless provider: empty credentials, pass-through inject

README Diagram has no API key. The compiler requires `auth.inject` to resolve
(`endpoint ?? provider`), and the only presets are `header` and `bearer`, both
of which read `data.params.apiKey`. So the provider declares
`credentials: z.object({})` and `inject: ({ data }) => data.request`, which
returns the request as built; there is no secret to inject and none to leak.
Every endpoint is `UsageModelKind.FREE`, so no credit system is declared.

Rejected: a dummy `apiKey` the service ignores (it would make every caller set
an env variable for nothing); a new `presets.auth.none` (an engine/shared
change, which a connector-only PR must not carry, and the pass-through lambda
is already a closed term the linter accepts).

Consequence for tests: `liveSkip("readme-diagram", [])` is always true, because
it opens only when every declared credential field is set. The live test is
gated on `README_DIAGRAM_LIVE=1` instead.

## D2 — `POST /render` is not exposed

`directTransport` sets `content-type: application/json` and `JSON.stringify`s
every request body. `/render` reads the body as raw Markdown, so a JSON body is
drawn as a README that says `{"markdown": ...}`: it answers 200 with an empty
"Project" diagram, which would pass every check and be wrong. Exposing it would
ship an endpoint that silently returns the wrong picture. It can be added when
either side changes (a raw-text body in the engine, or a JSON body accepted by
the service).

## D3 — The output is an SVG string

The engine's sniffing decode returns a body that is not JSON as the complete
raw string, so the success output is the SVG markup and the error output is the
plain text `not-found`. No `fromResponse` is needed.
