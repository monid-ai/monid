# Proposal: add-connector-string

## Why

String Web Access is our own web-access API: search the web, fetch any URL
or send it a request, all returned as clean, LLM-ready content. Three JSON
endpoints on one host, one bearer key, no new engine capability — search
settles a flat per-page rate, fetch and request settle one of the
output-determined rates read off a response header. Listing it here reaches
every Monid-integrated agent.

## What Changes

- **connectors/string** — 3 endpoints against
  `https://request.usestring.ai/v1`, bearer auth, laid out the way String's
  own `/v3` tool surface is (portal.usestring.ai/docs/mcp/v3): each endpoint
  does one kind of thing, so what a call can change is plain from which
  endpoint it is.
  - `string#search` (`POST /search`, reads only): `COMPOSITE` of two
    `PER_UNIT`·`PAGE` lines at the Growth-tier search rate ($0.001):
    `search`, one per results page that answered, and `ai_overview`, one
    when `aiOverview: true` fills the overview Google streams in. Without
    `searchCount` (1-300), always 1 page; with it, Google pages further
    results (up to 36) to collect enough, and the estimate holds that 36-page
    cap. Evidence reads `paging.pages` when present, else 1, and settles
    0 for a search that comes back with nothing (Google reports no match,
    or no results and no other part of the page), as Monid absorbs a run
    that returns no results. The binding offers `engine` `google`
    (default) and `google_ai_mode`, the engines String's `/v3` search tool
    offers; the mirror keeps the vendor's full list.
  - `string#fetch` (`POST /fetch` with a GET, reads only): Markdown by
    default, `solveCaptcha` false unless the caller sets it, and no method,
    body, browser actions or screenshots on the input. `COMPOSITE` of five
    `PER_UNIT`·`RESULT` lines (`request_standard`, `request_premium`,
    `browser_standard`, `browser_premium`, and `search` for a Google results
    URL answered through Search), each the Growth-tier rate for that billed
    type ($0.0002–$0.004). The billed type is OUTPUT-determined — named by
    the response header `x-billed-request-type`, not knowable from the
    request alone (the proxy class is picked per destination). `jsonSchema`
    extraction is not exposed: its surcharge scales with page/schema size
    with no published flat rate.
  - `string#request` (`POST /fetch` with a POST, PUT or PATCH and a body):
    the one endpoint that can change data on another site, kept apart from
    `string#fetch` as `/v3` keeps them. Declares `endpoint: "/request"`,
    since it binds the same native path as `string#fetch`. JSON envelope by
    default, `solveCaptcha` false unless set. `COMPOSITE` of the two
    request-based lines only: a request with a body is never sent on a
    browser path.
- **A response header reaches `usage.evidence` via lifecycle state, not the
  declarative path.** The declarative `usage.evidence` envelope carries
  `input`/`output`/`lifecycle.state` — no response headers. `fetch` and
  `request` use a single-tick `lifecycle.start` (no `poll`: `/fetch` is
  synchronous, no job id) that reads `x-billed-request-type` off the raw
  response and stashes it on `state.data.billedRequestType`, the documented
  billing-signal channel for a settled value read off
  `lifecycle?.state.data`. `evidence` settles the one matching line of the
  doc's own model, and settles zero when the header is absent or names a line
  the doc does not have. Both fns are byte-identical across the two
  endpoints, so each interns to one fnTable entry.
- **`shared/testing/fixtures.ts`** — `RECORDED_RES_HEADERS` gains
  `x-billed-request-type`, the one addition needed for a fixture to
  record/replay the header `fetch`'s and `request`'s billing depends on.
  Allowlisted, not a credential, no other connector's behavior changes.
- Fixtures are synthetic (`synthetic-` prefix), provider-level shared chains
  built from String's own published example responses.

## Capabilities

- `string-connector`.

## Non-goals

- `/v3`'s sitemap tools (quote, start, status) — a later change. A crawl is
  priced per page at the rate in its own quote, and no flat per-page rate is
  published to pin a rate card to.
- The rest of String's `/fetch` surface: browser actions, screenshots, XHR
  and iframe capture, `waitUntil`, `requireWSS`, Markdown tuning and
  `ignoreCertificateErrors` — none of them is on `/v3`.
- Pricing String's plan tiers as separate credit pools. String bills in
  plan-tier USD with no vendor "credits" abstraction and no settle-time
  cost receipt on the response, so every endpoint quotes the Growth tier as
  a fixed rate rather than modeling tier selection.
- `jsonSchema` structured-extraction pricing on `fetch` — no published flat
  rate to model; left unexposed rather than guessed.

## Impact

New connector tree, including its own connector-local `search` input schema
and the provider-shared `/fetch` mirror; no new `Unit`, preset, or hook, and
no shared schema contract change — `ENGINE_VERSION` and `config.yml`'s
`doc_format_since` are untouched. One test-infra change:
`RECORDED_RES_HEADERS` widens by one entry.
