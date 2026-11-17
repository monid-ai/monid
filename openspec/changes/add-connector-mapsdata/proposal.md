# Proposal: add-connector-mapsdata

## Why

MapsData (mapsdata.ai) turns Google Maps into outbound lead lists: every
business in a category across whole regions or named cities in the US,
Canada, the UK and Australia, with the business's website visited for
contact emails and each email verified. The catalog's existing maps
endpoints return listings; this one returns listings joined to a verified
email, which is the row a lead-generation agent actually needs. The vendor
publishes a stable REST API (`/api/v1`, OpenAPI at
`https://mapsdata.ai/api/v1/openapi.json`) with bearer keys.

## What Changes

- **connectors/mapsdata**: 4 endpoints, `Authorization: Bearer` auth,
  base `https://mapsdata.ai/api/v1`:
  - `mapsdata#jobs` (`POST /jobs`): ASYNC. Submit, poll the job to a
    terminal status, then fetch the emails-scope CSV through the vendor's
    15-minute signed link and return `{job, leads}`. PER_UNIT `RESULT`,
    1 MapsData lead per delivered row, with `job.email_count` (the vendor's
    own billing figure) as the D27 claim. `total_limit` required (the
    estimate). `dry_run` settles on the submit and bills 0. Idempotency-Key
    derived from the run id. 2-hour run budget, 30 s poll cadence.
  - `mapsdata#categories` (`GET /categories`), `mapsdata#categories/validate`
    (`GET /categories/validate`), `mapsdata#regions` (`GET /regions`):
    the free lookups that make a valid submission. FREE.
- **One credit pool** `default` ("MapsData leads"): a lead is a delivered
  row carrying a deliverable email, the unit the vendor bills its own
  subscribers in. Provider-level model FREE; `/jobs` overrides.
- Fixtures are all `synthetic-` (shaped from the vendor's published
  response models); the live test runs only a category check and a dry run,
  which spend nothing.

## Capabilities

- `mapsdata-connector`.

## Non-goals

- `GET /jobs`, `GET /jobs/{id}`, `GET /jobs/{id}/download`,
  `POST /jobs/{id}/cancel`, `GET /usage`, `GET /clients` (see design D1).
- `client_id` on the submit body (design D1).
- The all-rows and xlsx exports (design D3).

## Impact

New connector tree plus four lines in `connectors/ids.lock.json`. No
schema/engine contract change: `ENGINE_VERSION` unchanged, no new `Unit`,
preset, hook or category leaf (`maps` exists).
