# Design: add-connector-datalegion

Port of monid-services `adaptors/datalegion` (v1, 4498dc9b, 2026-10-16).
Only the choices the port was FORCED to make. Everything not listed follows
the precedents: sync POST → exa, several keys → contactout, enrichment with
a 404 miss → pdl.

## D1 — Six keys; the key, not a field filter, selects the product

Monid holds one dedicated Data Legion key per product (v1 config
`api_key_person_base_no_pii` … `api_key_company_premium`, secret fields
`DATALEGION_API_KEY_*`). Data Legion has no tier parameter: each key is an
account entitled to one product, and the vendor returns that product's
fields and bills that product's rate. v1 states the rule outright: "No
response-field filtering emulates a product tier" and "The dedicated key
selects the product".

So the provider declares ONE credential object holding all six keys, both
v1 parity (all six configured) and the contactout D1 posture, and NO
inject. Each endpoint declares its own inline `auth.inject` placing its key
in the `API-Key` header. A provider inject is impossible: four products
share `POST /person/enrich` and two share `POST /company/enrich`, so the
request alone cannot tell them apart. `presets.auth.header` reads
`data.params.apiKey`, so the injects are spelled inline.

Rejected: one key plus `exclude_fields` on the request and a field drop on
the response (this PR's first cut). It bills every product at the one
key's rate, it depends on our drop list being complete to keep contact
data from a no-PII caller, and the drop walked `matches[]` while the vendor
nests each record under `matches[].person` / `matches[].company` (OpenAPI
`PersonMatchResponse`), so on a real response it removed nothing.

## D2 — One credit pool per key, 1 credit per successful call

v1 bills `billedUnits` 1 on any 2xx and 0 otherwise, at a per-product
contract rate (price sheet 2026-10-15, USD per call):

| product | pool | v1 rate |
|---|---|---|
| `person/enrich/base/no-pii` | `person_base_no_pii` | 0.013 |
| `person/enrich/base/pii` | `person_base_pii` | 0.065 |
| `person/enrich/premium/no-pii` | `person_premium_no_pii` | 0.052 |
| `person/enrich/premium/pii` | `person_premium_pii` | 0.104 |
| `company/enrich/base` | `company_base` | 0.013 |
| `company/enrich/premium` | `company_premium` | 0.052 |

Data Legion meters credits ("1 credit = 1 record returned",
datalegion.ai/pricing), and each key is its own account, so each key gets
its own pool and every endpoint is `PER_CALL` at 1 credit from its key's
pool. The $/credit rates above are the broker card's job (contactout D2:
pools per key because each key's credit has its own price). Two pools
(`person`, `company`) cannot carry six prices.

`PER_CALL` rather than `PER_UNIT` `RESULT`: v1 bills the call, and the
single-result call answers 404 when nothing matches, so a 2xx always
carries one record. The body has no meter, so there is no `consolidate`;
the tests pin the rates as literals (clay D7a).

## D3 — The vendor body rides out unchanged

No `toRequest`, no `fromResponse` (v1 relays the upstream body unchanged).
The caller's own `include_fields` / `exclude_fields` / `required_fields`
pass through as sent.

## D4 — Identifier rules: a union for company, notes for person

v1 rejects a body with no identifier before the fetch.

- **Company** ("Provide a company identifier"): one of six fields, so the
  binding is a union of six `.required` arms (clay D13). `industry` alone
  fails; beside `name` it passes.
- **Person** ("a primary identifier OR a name plus context"): six
  identifiers, or one of three names together with one of nine contexts.
  As a union that is 33 arms, so the rule rides `meta.notes` and the
  vendor's own 400 (its OpenAPI: "Requires a primary identifier … OR name
  + context"), the contactout people-enrich posture. The one behaviour
  change from v1: a person body with no identifier reaches the vendor and
  comes back as a free 400 instead of a local `INVALID_INPUT`.

## D5 — Not exposed

`multiple_results` / `limit` (every extra match bills; v1 does not expose
them) and `pretty_print`. The body schemas are strict, so either is an
`INVALID_INPUT`. Search, discover and utility routes are not in v1.
