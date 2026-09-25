# Proposal: add-connector-dimhour

## Why

Dim Hour is a verified catalog of about 21,000 restaurants, bars and venues
across 24 North American cities. Each record carries the facts an agent needs
to act on a "where should we go" question: address, hours, phone, happy
hour, the booking path that takes reservations, awards, website and
Instagram, plus a dimhour.com link to cite. The catalog already serves agents
through a public, read-only MCP server (https://dimhour.com/mcp.html), so
Monid can offer it without a second API contract. It is the first local
venue catalog in this repository; it fits the existing `maps` leaf
("Maps and local-places data: businesses, reviews, and points of interest").

## Transport mapping

Dim Hour's source surface is one stateless Streamable HTTP MCP endpoint:
`POST https://mcp.dimhour.com/mcp`, JSON-RPC 2.0, headers
`content-type: application/json` and
`accept: application/json, text/event-stream`. The server answers JSON.

- **Nine logical endpoints, one physical path.** Each endpoint declares a
  stable public identity (`endpoint: "/search-venues"`, …) because the native
  path is shared transport plumbing (design D22, the contactout posture).
  All nine send `POST /mcp`.
- **Envelope construction.** Each endpoint's `input.toRequest` wraps the
  validated caller input as `params.arguments` of a `tools/call` request
  under a FIXED tool name. No other field is added.
- **Output unwrapping.** A provider-level `output.fromResponse` returns
  `result.structuredContent`. When a server omits it, the JSON in
  `result.content[0].text` is parsed instead.
- **Error classification.** An MCP server reports failure inside an HTTP
  200: a JSON-RPC top-level `error`, or a tool result with
  `isError: true`. A provider-level `lifecycle.start` makes the endpoint's
  own single request through `utils.request()` and only classifies it. An
  in-body failure, or a 200 with no usable JSON, settles as a 502 provider
  error (`providerHttpStatus` keeps the real 200), which the engine
  zero-bills. This is the hunterio `email-verifier` posture (its 222 answer)
  applied provider-wide. `start` never returns RUNNING and there is no
  poll. A provider-level `output.fromError` digests the envelope to
  `{message, error_code?, raw}`.
- **Auth.** None for reads. The credential shape is an OPTIONAL `apiKey`
  that travels as `x-api-key` only when configured (Dim Hour's free key
  lifts the anonymous daily cap). With no key the request goes out bare.

## Scope

- `connectors/dimhour`: provider + nine read endpoints, one per public read
  tool the live server lists (`tools/list`, 2026-09-24): `list-cities`,
  `search-venues`, `get-venue`, `list-new-venues`, `list-curated`,
  `find-places`, `get-hours`, `search`, `fetch`.
- `schema/inputs.ts` per endpoint: a faithful mirror of the live
  `inputSchema` (optionality, the source's bounds and enums, strictness where
  the source declares `additionalProperties: false`; no defaults, D25).
  `list-cities` takes no input.
- Provider-level shared fixture chains, recorded live and trimmed, plus
  three synthetic chains for shapes the live server does not produce on
  demand.
- `connectors/ids.lock.json`: the nine new ids.

## Billing: an open item

`usage.model` is `PER_CALL`, drawing 1 from a `default` pool whose unit is
one successful Dim Hour MCP call. It is isolated in
`connectors/dimhour/rate-card.ts`.

Sourced terms (https://dimhour.com/mcp.html): the free tier is $0 for
assistant use, at 1,000 calls a day anonymously or 10,000 with a free key,
with no bulk extraction and no redistribution. MCP Commercial is $499 a
month for serving your own product's users, with 250,000 calls a month
included, then $2 per 1,000.

NOT settled here: which of those terms, or a separately agreed rate, covers
Monid's traffic. The pool therefore carries no money value (credit → money
is the broker card's fact, D26), and the model is deliberately not `FREE`,
which would publish commercial traffic as permanently free.

## Non-goals

- No account, profile, write or operations tools (`save_venue`,
  `add_to_trip`, `list_my_trips`, `build_plan`, `check_availability`, …).
- No engine, compiler, schema or hook change, and no Dim Hour special case
  anywhere outside `connectors/dimhour`. `design.md` records only the
  choices the port was forced to make (D1-D3).
- No new category leaf.
- No bulk extraction: every limit is the source's own bound, nothing
  defaults a large page, and the tests never ask for more than 2 results.
- No `output.schema`. The live `outputSchema` exists, but binding it would
  turn an additive server-side field change into a failed run.

## Impact

New connector tree, nine ids in the lock. No engine version bump:
`minEngineVersion` stays at the repository floor.
