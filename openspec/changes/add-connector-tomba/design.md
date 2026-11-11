# Design: add-connector-tomba

Decision record for the Tomba connector. Sources: the docs.tomba.io
OpenAPI (`schema/paths/*.yaml`), the remote MCP tools reference
(`pages/llm/remote-mcp/tools.mdx`), and Credits and usage
(`pages/usage-and-quotas.mdx` § Credit costs), all read 2026-11-11.
Precedents: hunterio (layout, unions, required `limit`, `fromError`),
dataforseo (inline inject over a custom credential shape), contactout
(the `*_KEYS` live gate), pdl (several pools on one provider), clay
(COMPOSITE across pools), openai (`test-data.ts`).

## D1: Scope is the MCP server's data tools; ids derive from the path

The remote MCP server exposes 28 tools: 20 data tools plus 4 account
tools and 4 lead / flag tools. The connector ports the 20 (owner
decision 2026-11-11), each bound to the REST path its tool calls. That
path is the id: `tomba#people/find`, `tomba#reveal/search`. Folders are
the id with `/` replaced by `-`.

`phone_finder` calls `GET /v1/phone`, which the OpenAPI documents as an
alias of `GET /v1/phone-finder`. The connector binds the documented
path, `/phone-finder`.

## D2: Four pools (owner, 2026-11-11)

Tomba meters four balances, and each is its own pool:

| pool | endpoints |
|---|---|
| `search` | domain-search, email-finder, author-finder, linkedin, enrich, people/find, companies/find, combined/find, phone-finder, phone-validator, reveal/search, similar, and the verifier's phone line |
| `verification` | email-verifier |
| `email_count` | email-count, email-format, location |
| `sources` | email-sources |

`technology`, `domain-suggestions`, and `domain-status` are FREE.
`technology` needs a positive search balance but draws nothing.

## D3: Auth is a key pair, injected inline

Every request carries `X-Tomba-Key` and `X-Tomba-Secret`. No preset
speaks two headers, so the provider declares
`credentials: {apiKey, secretKey}` and an inline `inject` that sets both
(the dataforseo posture). Locally the env vars are
`TOMBA_CREDENTIALS_API_KEY` and `TOMBA_CREDENTIALS_SECRET_KEY`, and the
live tests gate on both through `TOMBA_KEYS`.

## D4: Errors are data; some misses are 200s

Tomba's failure envelope is `{errors: {type, message, code}}`, a single
object rather than an array. The provider `fromError` digests it to
`{message, error_code: type, raw}`, and the engine zero-bills every
non-2xx.

The Clearbit-format trio (`people/find`, `companies/find`,
`combined/find`) answers a no-match with **200** and an `errors` object
in place of `data`. That stays a success, so the vendor body relays
untouched, and the evidence counts 0 because there is no `data` object.
It costs nothing either way.

`email-sources` answers a miss with **201** and an empty array, which is
likewise a 0-count success.

## D5: `webhook_url` is not mirrored

Most finder endpoints accept `webhook_url`, which makes Tomba POST the
result to a caller URL as well. The engine owns delivery and egress, and
a callback to an arbitrary host bypasses both, so the field is left out
of every input schema. That makes it an INVALID_INPUT, the same exclusion
as hunterio's webhooks.

## D6: The charging conditions are counting rules (D19)

The published "charged when" conditions and input-selected prices are
evidence and estimate logic, never model shapes:

| endpoint | model | evidence |
|---|---|---|
| domain-search | COMPOSITE `results` PER_UNIT `every: 10` ×1 + `phones` ×5 | `results` = the requested `limit` when `data.emails[]` is non-empty, else 0. `phones` = returned addresses with non-empty `phone_data` |
| similar | PER_UNIT `every: 10` ×1 | the requested `limit` when `data[]` is non-empty |
| email-finder, enrich, linkedin | COMPOSITE `lookup` ×1 + `phones` ×5 (`schema/finder.ts`; email-finder and enrich also share one estimate and one evidence fn there) | `lookup` = an address whose verification status isn't `unknown`, or, for linkedin, every address returned (`full=true` → an array). `phones` = 1 when that result carries phone data ("1, or 6 with phone data") |
| author-finder, people/find, companies/find | PER_UNIT ×1 | 1 on a hit |
| combined/find | PER_UNIT ×2 | 1 when `data.person` is returned |
| email-verifier | COMPOSITE `verification` ×1 (verification) + `phones` ×5 (search) | the verdict counts unless the status is `disposable` / `unknown`; `phones` = the length of `phone_data` ("5 per phone number") |
| phone-finder | COMPOSITE `lookup` ×5 + `domain_lookup` ×1 | 1 on the line the input selects (a request that includes `domain` costs 1), counted only when a returned number is `valid` |
| reveal/search | PER_UNIT·PAGE ×1 | 1 when `data.companies[]` is non-empty |
| phone-validator | PER_CALL ×1 | every 2xx, including an empty result |
| email-count, email-format, location | PER_CALL ×1 (`email_count`) | every 2xx |
| email-sources | PER_UNIT ×1 (`sources`) | 1 when `data[]` is non-empty |

`domain-search` and `similar` require `limit` at the binding (D25):
it is the whole cost basis, and the vendor's default of 10 stays
documented. Estimates are the worst case: the full page, every address
with phone data when `enrich_mobile` is set, two addresses for
`linkedin` with `full=true`, and one phone number on the verifier's
add-on, since the vendor sets no upper bound there.

Every array read in an evidence fn goes through `optionalGet` +
`Array.isArray`, never `optionalLen`. Tomba's own examples return
`phone_data: null` (a disposable verdict) and `data: null` (no similar
companies), and `optionalLen` throws on a non-array, which would fail
the settle with FN_CONTRACT. The synthetic fixtures carry both shapes.

Tomba reports no meter in the body, so there is no `consolidate`, and
the derived fold is the bill. A repeat of the same request within the
usage window is free upstream; the doc states the published rate
(provider note).

## D7: Timeouts follow the vendor's advice

The OpenAPI says to "set a client timeout of at least 180 seconds",
because searches and verifications run live against mail servers and
websites. The provider sets `requestMs: 180_000` and `runMs: 200_000`.
