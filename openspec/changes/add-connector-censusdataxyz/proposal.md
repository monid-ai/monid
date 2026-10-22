# Proposal: add-connector-censusdataxyz

## Why

censusdata.xyz is live in the hosted Monid catalog (2 endpoints) but absent
here. It is a hosted AI agent over the US Census Bureau API: one
plain-English question in, a `summary` plus the `raw_data` it used out. It
ports from monid-services `adaptors/census` with no contract change.

## What Changes

- **connectors/censusdataxyz** — base `https://censusdata.xyz`, `X-API-Key`,
  30 s request and run budgets (monid-services parity), FREE usage, and a
  provider `output.fromResponse` that plucks the top-level `quota`.
  - `censusdataxyz#query` — `GET /query?q=…`.
  - `censusdataxyz#explore-variables` — `GET /explore-variables?keyword=…`.
- **Name**: the brand is dotted and provider names are kebab-case, so the
  connector is `censusdataxyz` with displayName "censusdata.xyz" (the
  `context.dev` → `contextdev` precedent). Credentials read
  `CENSUSDATAXYZ_CREDENTIALS_API_KEY` (alias `CENSUSDATAXYZ_API_KEY`).
- **Usage is FREE**: censusdata.xyz charges nothing; a free key carries a
  daily allowance, and an exhausted one answers 429 (zero usage). The price
  the hosted catalog shows on `/query` is Monid's, not the vendor's, so it
  is not a connector fact.
- **`quota` is stripped**: it is the shared key's daily allowance, not part
  of the answer (monid-services `stripQuota`).

## Non-goals

- `POST /query` and `GET /health`, which the vendor also serves; the hosted
  catalog exposes the GET form only.

## Impact

- Fixtures are SYNTHETIC, shaped from censusdata.xyz/skill and the
  monid-services census tests.
- Hosted ids are `censusdata.xyz#…`; here they are `censusdataxyz#…`.
