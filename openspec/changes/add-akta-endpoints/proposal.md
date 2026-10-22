# Proposal: add-akta-endpoints

## Why

The hosted Monid catalog lists 20 Akta endpoints; this repo carries 6. The
other 14 are already live for agents on monid.ai, so the open connector
standard is behind the product it describes. Akta publishes a machine-readable
contract for all of them (`agent-docs.akta.pro/openapi.json`) and a credit
table that prices every one (`agent-docs.akta.pro/getting-started/pricing`),
so they port without new schema or engine work.

## What Changes

- **connectors/akta** — 14 endpoints added beside the existing 6, all
  inheriting the provider's `x-api-key` auth, array→CSV `toRequest`, and
  `credits_consumed` consolidate; all but markdown also inherit the
  generic evidence (markdown counts its own sections):
  - Company readers: `v1/company/enrichment/concise` (flat 3),
    `v1/company/enrichment/markdown` (per section),
    `v1/company/enrichment/logo/{company}` (FREE),
    `v1/company/enrichment/partnerships/{company}`,
    `v1/company/enrichment/peers/{company}`,
    `v1/company/enrichment/swot/{company}` (flat 0.5 each).
  - Alternative signals: `v1/company/headcount-trends` (flat 2.5),
    `v1/company/website-traffic` (flat 1.5), `v1/company/jobs` (4 per started
    block of 10), `v1/company/posts` (1 per started block of 10).
  - List generation: `v1/filters/list` and `v1/filters/options` (FREE),
    `v1/list/generate/companies` (1.5 + 0.2 per company).
  - News: `v1/news/by-id` (0.1 + 0.01 per article, the news card).
- **schema/common.ts** gains `zCompanyPathParams`, shared by the four
  `/{company}` readers.
- **Bindings, not mirrors, tighten** (D25): `jobs` and `posts` require
  `limit`, list generation requires `limit`, markdown requires `sections` —
  each is its endpoint's estimate basis.
- **markdown owns its evidence**: `data` is one Markdown string, so it
  counts the response's own `sections_included`.
- `connectors/ids.lock.json` gains exactly these 14 ids; the lock's
  pre-existing drift on other providers is left untouched.

## Non-goals

- The 15 single-section readers (`/v1/company/enrichment/<section>/{company}`)
  and `/v1/list/filter-builder` the OpenAPI also lists: they are not in the
  hosted catalog either.
- Re-pinning `company-enrichment`. The current credit table lists
  `management_profile` at 1 and `industry` at 0.5 where its pins say 1.5
  and 1. The vendor claim settles every run regardless, and a stale pin
  surfaces as `usage.mismatch.derived`; re-pinning is a separate, recorded
  change. Akta's own docs also disagree on `industry`: the API pricing and
  CLI pages say 0.5, the docs.akta.pro MCP page says 1 — likely
  plan-dependent, so the account's plan decides the pin.
- The news `primary_company` filter the docs now mention.

## Impact

- Fixtures are SYNTHETIC (`synthetic-` prefix), shaped from the OpenAPI
  response schemas with `credits_consumed` set to the published card. A
  `deno task record` pass with an Akta key should replace them before or
  after merge.
- No engine, compiler, or contract change; no version bump.
