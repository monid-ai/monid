# Proposal: add-connector-prova

## Why

Prova (provaapi.com) answers one question an agent asks often: *how has this
company been funded?* Give it a website, a name, or a LinkedIn slug and it
returns every funding round it found, newest first, with stage, amount,
currency, date, investors, and lead investors, plus the latest equity round
on its own. Each round carries its source: `confirmed` rounds were checked
against a public announcement, `database` rounds come from a funding
database and were not. A company Prova has not seen before is looked up
live, usually in about five seconds.

It fits the connector standard without stretching it: one base URL, bearer
auth, a published OpenAPI document (`https://api.provaapi.com/openapi.json`),
and a flat dollar price.

## What Changes

- **connectors/prova** — one endpoint, `funding-stages`
  (`POST /api/v1/funding-stages`).
- **The pool is US dollars**: $0.01 per lookup answered `found`
  (`PER_UNIT`·`RESULT`); `not_found`, `pending`, and errors are free. No
  response carries a meter, so the derived fold is the charge.
- **`funding-stages` owns a `lifecycle.start` / `poll` pair**: for a company
  it has not researched, Prova waits up to ~5 s and then answers 202
  `{status: "pending"}` ("send the same request again in a few seconds").
  The poll re-posts the same body every 3 s for up to 60 s; a 5xx mid-lookup
  keeps polling. Re-posts are free, so a run bills at most once.
- **The exactly-one identifier rule** (name | domain | linkedinSlug) stays a
  documented constraint; Prova answers 422 otherwise.
- **`view` mirrors only `full`**: `raw` and `simple` are legacy shapes with
  no `status`, which the billing evidence reads.
- **Fixtures**: three recorded from the live API on 2026-10-24 (found,
  not_found, 422) and one synthetic (202 then found), whose 202 body is the
  documented pending answer.

## Capabilities

- `prova-connector`.

## Non-goals

- **`POST /funding-stages/bulk`** — up to many companies per call with
  per-item answers; a follow-up once the single lookup is listed.
- **Account surfaces** (`/usage`, `/keys`, `/billing/*`, `/webhooks`,
  `/corrections`) — hosted concerns, never catalog endpoints.
