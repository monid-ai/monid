# Proposal: add-connector-datahyena

## Why

Datahyena (datahyena.com) serves company events as a self-serve API: funding rounds, acquisitions and mergers, executive moves and hiring signals, each deduplicated, dated by its announcement and attached to a resolved company (domain, LinkedIn page, country, industry, headcount). It fills the event side of `funding-data` and `company-news` beside Fundable's round search: M&A, leadership changes and job-board hiring signals have no endpoint in the catalog today.

The surface is uniform: one synchronous GET each against `https://api.datahyena.com/v1`, `X-API-Key` auth, a `{success, data, pagination, meta}` envelope, and the vendor's own credit meter (`meta.creditsUsed`) on every response. Nothing needs a new engine capability.

## What Changes

- **connectors/datahyena**: 6 endpoints, all sync GETs inheriting the provider's header auth, timeouts, credit pool, vendor-meter `usage.consolidate` (plucks `meta.creditsUsed`, strips the account-level `meta.creditsRemaining`) and generic `usage.evidence` (the length of the `data` array).
  - `GET /funding-events`, `/acquisitions`, `/exec-moves`, `/hiring-signals`, `/companies`, `/investors`: PER_UNIT·RESULT at 1 credit per row, `limit` REQUIRED and capped at 100 (the vendor maximum) at the binding, estimate = `limit`.
  - Lists are sent as repeated query keys, which is the vendor's own spelling, so no endpoint reshapes the request or the output.
- Synthetic fixtures (`synthetic-` prefix) for every endpoint (happy and empty), to be replaced via `deno task record` once a key is held.
- `connectors/ids.lock.json`: the six new ids.

## Capabilities

- `datahyena-connector`.

## Non-goals

- `GET /companies/timeline` and `GET /companies/hiring` (single-company lookups) are left out of v1: the timeline bills a variable number of rows (the company plus each event included) and the hiring profile bills 0 while a company is first read, neither of which the flat models express cleanly. Both can follow once the claim-only settle shape is agreed.
- No dollar conversion in the doc: pools are the vendor's credits; the conversion stays the broker card's job.

## Impact

New connector tree and six lock entries; no schema or engine contract changes (`ENGINE_VERSION` unchanged, no new `Unit`, no new preset).
