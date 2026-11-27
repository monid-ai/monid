# Proposal: add-connector-dealport

## Why

Agents working on M&A origination, commercial real estate, B2B research, and
account qualification need primary-cited intelligence on private US operating
businesses, the buildings they occupy or own, and the verified human principals
behind them. Dealport indexes 28M+ US private companies and NYC commercial and
multifamily properties across primary public filings (corporate registries, UCC
filings, CMS cost reports, state licenses, SEC Form ADV, and NYC property and
mortgage records), resolves verified human owners and direct phones/emails, and
serves clean website Markdown.

Mechanically it fits the synchronous HTTP connector shape cleanly: one base URL
(`https://app.dealport.com`), Bearer authentication, nine synchronous JSON
endpoints under `/api/v1/*`, plain US dollar pricing from the published OpenAPI
3.1 specification (`https://app.dealport.com/openapi/v1.json`), and per-call
billing receipts (`cost_usd` / `credits_charged`) on every response. No engine
or compiler changes are required.

## What Changes

- **connectors/dealport**: 9 synchronous endpoints against
  `https://app.dealport.com` with `presets.auth.bearer()`:
  - `POST /api/v1/companies/preview` (`FREE`, $0.00 market sizing and 5 sample
    companies)
  - `POST /api/v1/companies/match` (`FREE`, $0.00 entity matching for up to 250
    company names/domains)
  - `GET /api/v1/companies` (`PER_UNIT`, $0.01 per new company Record returned,
    $0.00 on 30-day workspace repeat)
  - `GET /api/v1/buildings` (`PER_UNIT`, $0.01 per new NYC building Record
    returned, $0.00 on 30-day workspace repeat)
  - `GET /api/v1/records/{id}` (`PER_UNIT`, $0.01 per new company or NYC
    building Record opened, $0.00 on 30-day workspace repeat)
  - `POST /api/v1/pages` (`PER_UNIT`, $0.01 per live company website fetch,
    $0.00 when served from the 30-day cache or unreachable)
  - `POST /api/v1/owners` (`PER_UNIT`, $0.09 per verified human owner contact
    hit, $0.00 when not found or on 30-day workspace repeat)
  - `POST /api/v1/contacts` (`PER_UNIT`, $0.09 per verified principal contact
    hit, $0.00 when not found or on 30-day workspace repeat)
  - `POST /api/v1/buildings/owners` (`PER_UNIT`, $0.00 quote when
    `confirm_max_usd` is omitted; $0.05 per distinct NYC building owner
    resolved when confirmed)
- **US dollar rate card and vendor claim consolidation**: Dealport bills in
  plain US dollars (`default` pool labeled `US dollars`, matching `exa` and
  `openai`). Provider-level `usage.consolidate` plucks Dealport's billing
  receipt fields (`cost_usd`, `credits_charged`, `remaining_balance_usd`, plus
  their `$.data.*` mirrors on batch envelopes) so billing metadata never leaks
  into caller output while the vendor's reported dollar charge settles each run.
- **Zero-charge misses, caches, quotes, and 30-day repeats**: Metered endpoints
  use `PER_UNIT` (`Unit.RESULT`) so empty searches, owner misses, cached website
  reads, unconfirmed quotes, and 30-day repeat reads count `0` units and settle
  at `$0.00`.
- **connectors/categories.ts**: add `real-estate` leaf for commercial and
  multifamily building search and property owner resolution.
- **connectors/ids.lock.json**: register the 9 new `dealport#api/v1/*` endpoint
  identities by hand without disturbing unrelated connectors.

## Capabilities

- `dealport-connector`.

## Non-goals

- **Workspace-stateful Project, Playbook, weekly watch, blocklist, pipeline,
  and Avery outreach routes are not ported.** Under a shared broker credential,
  workspace-scoped saved lists, recurring monthly watch subscriptions, and
  outbound outreach through Avery (Dealport's AI outreach specialist) would mix
  tenant state (same tenancy boundary as `vaquill`'s `/watches`). For that same
  reason, `watch`, `project_id`, and `project_name` are omitted at the binding
  on `POST /api/v1/companies/match`, and `project_id` and `project_name` are
  omitted at the binding on `POST /api/v1/buildings/owners`.
- **Async deep company research (`/api/v1/research`) is deferred** to a
  follow-up async lifecycle change.

## Impact

New connector tree (`connectors/dealport/`), one new leaf in
`connectors/categories.ts` (`real-estate`), and 9 new endpoint ids in
`connectors/ids.lock.json`. No engine, compiler, schema, or `ENGINE_VERSION`
changes.
