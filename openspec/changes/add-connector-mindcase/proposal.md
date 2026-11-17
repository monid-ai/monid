# Proposal: add-connector-mindcase

## Why

Mindcase is a web data API: hosted agents across 110 platforms that return
structured rows. Social (LinkedIn, Instagram, TikTok, X, Facebook,
YouTube, Reddit, Threads, Telegram, Pinterest, Twitch and the main Chinese
platforms), people and company enrichment (emails, phones, firmographics, tech
stack), e-commerce (Amazon, Walmart, Target, eBay, AliExpress, Shopee, Lazada
and more), Indian quick commerce (Blinkit, Zepto, Swiggy Instamart, BigBasket,
Flipkart Minutes, Amazon Now), jobs, software and local reviews, SEC and Yahoo
Finance data, crypto, US real estate, customs shipments, web scrape/crawl/
extract, and Indian company registries (MCA, GST, EPFO). Several of those
sources exist nowhere else in the catalog, most visibly store-level quick
commerce prices and stock and the MCA/GST/EPFO lookups.

Every agent runs through the same three-call job protocol and bills per
returned row from a USD wallet, and every job record reports its own total
(`usd_used`). That is a clean fit for the connector standard with no engine
change.

## What Changes

- **connectors/mindcase**: 242 endpoints, landing in two PRs to stay
  under the review bot's file limit (part 1: provider plus 101 endpoints;
  part 2: the remaining 141), against `https://api.mindcase.co`,
  bearer auth (`mk_live_...` keys), one provider-level lifecycle, error digest
  and vendor-meter `usage.consolidate`.
  - start: `POST /v1/data/{group}/{slug}/run` with `{params}`; a provider
    `input.toRequest` wraps the caller's flat body so endpoint schemas mirror
    the agent's parameters one to one.
  - poll: `GET /v1/jobs/{id}` until terminal, then `GET /v1/jobs/{id}/results`
    (every row in one response, no paging). `failed`, `cancelled` and
    `rejected_balance` synthesize 500, 409 and 402 error-as-data.
  - stop: best-effort `DELETE /v1/jobs/{id}`.
- **One endpoint per agent, plus one split.** `linkedin/profiles` is two
  endpoints sharing `schema/linkedin-profiles.ts`: `#linkedin/profiles`
  (by URL, per profile) and `#linkedin/profiles/search` (keyword and filters,
  a flat $0.05 search fee per run plus per profile). The two modes bill
  differently, so one doc could not estimate both honestly.
- **Generated mirrors.** Each `schema/inputs.ts` is generated from the agent's
  published schema (`GET /v1/data/{group}/{slug}?expand=options`): types,
  required, min/max, maxItems, and `z.enum` for option lists of 50 or fewer.
  Larger option lists (brands, store ids, pincodes, industry ids) stay
  strings and say where to list the values. `.strict()` because the API
  rejects unknown keys with 422.
- **Billing.** Pool `default` is US dollars. Most agents are a leaf
  `PER_UNIT` RESULT at the published per-row price. Composites:
  - a flat search fee once per run, including runs that find nothing:
    `#linkedin/profiles/search` ($0.05), `#linkedin/company-employees`,
    `#linkedin/jobs`, `#linkedin/post-comments`, `#linkedin/post-reactions`,
    `#linkedin/profile-comments`, `#discord/servers`, and the fees declared
    on an input mode (`#amazon/products` keyword, `#reddit/posts`,
    `#twitter/tweets` search);
  - a per-mode row rate (`#people/professional-email` by name and company);
  - photo and image add-ons per delivered unit on `#google-maps/places` and
    `#tripadvisor/{attractions,hotels,restaurants}`.
  `#ycombinator/founders-dataset` is FREE. Rates come from the live public
  schema and settled production jobs. The vendor's `usd_used` claim settles
  every run; the fold is the cross-check.
- **Estimates.** Every row limit is bound with `min(1)` before any default,
  because the raw API reads 0 as unlimited. Limits documented per input (per
  domain, app, keyword, product, query, post) multiply by the number of
  inputs, counting one per array entry or non-empty line. URL modes the
  limit does not apply to count one row per URL. Lookups bill one row per
  input, so their limit is optional and only stops early. Legacy
  single-person inputs are not exposed.
- **Sibling pointers.** Where endpoints overlap (people vs company emails,
  SEC filings vs financials, web scrape vs crawl vs map, App Store vs Google
  Play), the description names the sibling to use instead.
- **Categories.** New leaves: `quick-commerce`, `blinkit`, `instamart`,
  `bigbasket`, `flipkart-minutes`, `amazon-now`, `ecommerce`, `ads`,
  `web-traffic`, `local-business`, `social-media`, `real-estate`.

## Capabilities

- `mindcase-connector`.

## Non-goals

- No `?wait=true` synchronous mode: it caps inline rows at 100, so the
  lifecycle always polls.
- Model passthrough agents (`ai/embeddings`, `ai/images`, `ai/rerank`,
  `ai/speech`, `ai/transcription`, `ai/videos`, `llm/route`, `llm/decisions`)
  are not listed: they bill per model, not per row.
- No dataset download (`/v1/jobs/{id}/download`); `/results` already returns
  every row as JSON.

## Impact

New connector tree, twelve category leaves, `ids.lock.json` entries. No new
`Unit`, preset, hook or engine change.
