# Proposal: add-connector-specstream

## Why

SpecStream (specstream.ai) is the live web data engine for teams and
agents. Describe the data you need in plain words, and it returns
structured rows from the live web, every value linked to the page it came
from. The public API (`https://api.specstream.ai`, OpenAPI at
`https://specstream.ai/openapi.json`, Bearer API key) carries a request
from plain words to sourced rows in four steps, which fits Monid's
catalog of tools an agent calls with one key: a fit for an agent that
needs a list or a dataset with its sources, not a single fact.

## What Changes

- **connectors/specstream**: 4 endpoints, `Authorization: Bearer` auth,
  60 s request budget:
  - `specstream#v1/parse` (`POST /v1/parse`): a request in plain words
    becomes a reading (`read_back`, `chips`, `unsupported`, `ast_hash`).
    Free.
  - `specstream#v1/capacity/quotes` (`POST /v1/capacity/quotes`): prices a
    reading. Returns a signed quote with `maximum_cents`, valid for 30
    minutes. Free; nothing runs.
  - `specstream#v1/capacity/executions` (`POST /v1/capacity/executions`):
    approves a quote and runs the find as a durable job (start, poll,
    stop). Completes with the first page of rows, each cell carrying the
    `source_url` and `observed_at` of the page it was read from, plus the
    `commerce` receipt. The only endpoint that spends.
  - `specstream#v1/finds/{id}/rows` (`GET /v1/finds/{id}/rows`): reads the
    rows of a finished or running find, page by page with `cursor` and
    `limit`. Free.
- **One credit pool** `default` ("US dollars"), a provider-level `FREE`
  model, and a metered model on the run endpoint only (see design D2).
- Fixtures are all `synthetic-`: shaped exactly like the schemas in the
  public OpenAPI document, checked against them with a JSON Schema
  validator. No recorded traffic exists because the connector was never
  run against a live key.

Added on 2026-11-14: the two one-call endpoints, `specstream#v1/web-search`
(a question answered from the live web with the page behind each value, or
the results alone on the fast tier) and `specstream#v1/extract` (up to 20
pages read live, each page's main text). Each reply states its own price
(design D6).

## Capabilities

- `specstream-connector`.

## Non-goals

- The one-shot `POST /v1/capacity/requests`. The four-step flow shows the
  price before anything runs, which is the point for a caller that spends
  on someone's behalf.
- Continuation operations on a finished find (refresh, added facts,
  retained work), saved requests and lists, schedules, webhooks and
  destinations. Each is its own change if the catalog wants it.
- The pay-per-call routes (`/v1/agent/lists`, MPP and x402). A Monid key is
  the payment path here.
- The MCP server and the A2A card. This connector is the REST surface.

## Impact

New connector tree. No schema or engine contract change: `ENGINE_VERSION`
unchanged, no new `Unit`, no new preset, no new hook, no new category
leaf (`web-search` already exists).
