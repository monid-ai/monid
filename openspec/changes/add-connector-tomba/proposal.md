# Proposal: add-connector-tomba

## Why

Tomba (tomba.io) finds, verifies, and enriches professional email
addresses, phone numbers, and companies over REST
(`https://api.tomba.io/v1`). Its remote MCP server already packages the
API as agent tools; this change brings the same data tools into the
catalog as endpoints, each bound to the REST endpoint its MCP tool calls
(docs.tomba.io/llm/remote-mcp/tools).

It is the first connector whose vendor meters FOUR separate balances
(search, verification, email count, sources) and whose auth is a key
PAIR sent as two headers.

## What Changes

- **connectors/tomba**: 20 endpoints, the data tools of the MCP server:
  `domain-search`, `email-finder`, `author-finder`, `linkedin`,
  `email-count`, `email-format`, `email-sources`, `email-verifier`,
  `domain-status`, `enrich`, `people/find`, `companies/find`,
  `combined/find`, `phone-finder`, `phone-validator`, `reveal/search`,
  `similar`, `technology`, `domain-suggestions`, `location`. Ids derive
  from the wire path (design D1).
- **Four pools** (owner decision 2026-11-11, design D2): `search`,
  `verification`, `email_count`, `sources`. Every one is drained.
- **Auth** (design D3): a `{apiKey, secretKey}` credential shape and an
  inline provider inject that sets `X-Tomba-Key` + `X-Tomba-Secret`.
- **Charging conditions are counting rules** (design D6): requested-limit
  blocks of ten (domain-search, similar), the finder family's 1 + 5 phone
  add-on, the verifier's verdict + per-number phone line, phone-finder's
  input-selected price (5, or 1 with domain), a page with companies,
  and hit-or-free enrichment.
- **Unions** for the vendor's one-of rules: domain | company
  (domain-search, similar), company × person (email-finder, 4 arms),
  email | domain | linkedin (phone-finder), query | filters
  (reveal/search), domain | email (domain-status).
- **Synthetic fixtures** built from docs.tomba.io's own OpenAPI examples
  (owner decision): happy, miss / variant, and a 401 provider error per
  endpoint, with one shared input table (`test-data.ts`) so an input and
  its replay URL cannot drift.

## Capabilities

- `tomba-connector`.

## Non-goals

- **Account and management endpoints**: `/me`, `/usage`, `/logs`,
  `/rate-limits`, `/keys`, `/leads`, `/leads/lists`, `/attributes`,
  `/flag`. Account state, not data. `/me` and `/keys` also return
  secrets.
- **Bulk jobs and scrape campaigns** (`/bulk/*`, `/sla/*`). Async
  multi-row jobs with their own billing; a separate change if wanted.
- **`webhook_url`** on every endpoint (design D5). Per-request callbacks
  to a caller URL are outside the engine's control.
- **No live recordings.** Replace the `synthetic-*` fixtures with
  `deno task record` output once a key is wired into CI (tasks 6.1).

## Impact

New connector tree plus 20 ids in `connectors/ids.lock.json`. No
`categories.ts` change (`people-enrichment`, `company-enrichment`, and
`linkedin` exist). No engine bump, no new `Unit`, no new preset, and no
hook-ABI change (`version:check` is clean).
