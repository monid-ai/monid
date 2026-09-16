# Proposal: add-connector-pdl

## Why

People Data Labs is a live v1 monid-services provider with four
synchronous endpoints — person and company enrichment and search. v1 spoke
to PDL through the vendor's JavaScript SDK; the SDK is a thin axios wrapper,
so the port speaks its wire form directly (GET enrichment with query-string
parameters, POST search with a JSON body). The port needs no new engine
capability.

## What Changes

- **connectors/pdl** — 4 endpoints, `X-Api-Key` auth, 60 s timeouts:
  - `GET /v5/person/enrich`, `GET /v5/company/enrich`: PER_CALL, one
    credit per match (a 404 no-match is data, zero usage).
  - `POST /v5/person/search`, `POST /v5/company/search`: PER_UNIT·RESULT,
    one credit per record in `data[]`; `size` REQUIRED at the binding
    (vendor bounds 1–100), estimate = `size`; `query` XOR `sql` as two
    strict variants.
- **Four credit pools**, one per PDL credit type (design D2): `enrich`,
  `search`, `enrich_company`, `search_company` — the vendor's own
  `x-call-credits-type` values; each endpoint drains its own at 1 credit
  per record or match.
- **No `usage.consolidate`**: PDL reports its meter only in response
  headers, which hooks cannot read; the derived fold settles.
- Synthetic fixtures (`synthetic-` prefix) — no `PDL_API_KEY` is held.

## Capabilities

- `pdl-connector`.

## Non-goals

- The SDK's other surfaces (bulk enrichment, retrieve, autocomplete,
  identify, cleaner, job title, IP, changelog) — never in v1's catalog.
- The v1 balance probe (`x-totallimit-remaining` header) — a hosted
  concern, and headers are not visible to hooks.
- The v1 `dataset: "all"` default on person search: PDL documents its own
  default, and no estimate reads the knob, so it stays plain optional.

## Impact

New connector tree + README row; no schema/engine contract changes.
