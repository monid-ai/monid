# Proposal: add-connector-specstream

## Why

SpecStream (specstream.ai) is a live web search and page-reading API for
teams and agents (`https://api.specstream.ai`, OpenAPI at
`https://specstream.ai/openapi.json`, Bearer API key). Its two one-call
endpoints, `POST /v1/web-search` and `POST /v1/extract`, answer a
question from the live web with source URLs or return up to 20 pages'
main text in a single synchronous request. That fits Monid's catalog of
tools an agent calls with one key.

## What Changes

- **connectors/specstream**: 2 endpoints, `Authorization: Bearer` auth,
  60 s request budget (`requestMs: 60_000`, `runMs: 65_000`):
  - `specstream#v1/web-search` (`POST /v1/web-search`): searches the live
    web in one call. Default mode reads the pages it finds and returns
    `answer` (or `rows`) plus `sources`; `speed: "fast"` or `news: true`
    returns search results alone. $0.005 for up to 10 results ($0.001 for
    fast or news), plus $0.006 ($0.0012 fast/news) per started block of
    10 additional results.
  - `specstream#v1/extract` (`POST /v1/extract`): reads 1 to 20 public
    http or https URLs live and returns each page's `status`, `title`,
    `text` (Markdown, plain text, or HTML), `published`, and `emails`.
    $0.0008 per page that yields text; pages that give no text are not
    charged.
- **One credit pool** `default` ("US dollars"), with each endpoint
  declaring a `PER_UNIT` `Unit.CREDIT` model in hundredths of a cent
  (`consumes: { credit: "default", amount: 0.0001 }`) and settling on
  the reply's `data.price_usd` receipt via `usage.consolidate`.
- **connectors/ids.lock.json**: adds `specstream#v1/extract` and
  `specstream#v1/web-search`.
- **Fixtures**: `synthetic-` chains shaped from real 2026-11-14 replies
  for answered search, fast search, 422 refused search, mixed extract,
  and 401 unauthorized key.

## Capabilities

- `specstream-connector`.

## Non-goals

- Multi-step table builds (parsing, quoting, durable execution, and row
  pagination) will follow in a separate PR.
- Image search and its filters on `/v1/web-search`, and the `pages`
  inline-HTML variant on `/v1/extract`.
- The pay-per-call routes (`/v1/agent/lists`, MPP and x402). A Monid key
  is the payment path here.
- The MCP server and the A2A card. This connector is the REST surface.

## Impact

New connector tree. No schema or engine contract change: `ENGINE_VERSION`
unchanged, no new `Unit`, no new preset, no new hook, no new category
leaf (`web-search` and `web-scraping` already exist).
