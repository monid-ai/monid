# Proposal: add-connector-ecommerce-leads

## Why

Ecommerce Leads (getecommerceleads.com) tracks 600,000+ ecommerce stores
and estimates, per store, monthly revenue, marketing budget, traffic by
channel, Google and Meta ad spend, ad counts, and a Conversion Rate
Score, plus plain-text buying signals. Agents that qualify ecommerce
prospects, size ad budgets, or research competitors need this per
domain. The catalog has company enrichment, but no ecommerce-specific
store metrics.

The connector is submitted by the vendor.

## What Changes

- **connectors/ecommerce-leads** — one endpoint, `stores/lookup`
  (`GET https://getecommerceleads.com/api/stores/lookup?domain=...`).
  Bearer auth with an Ecommerce Leads API key.
- **FREE** (vendor decision 2026-11-18): the lookup costs 0 credits on
  every Ecommerce Leads plan, so the provider model is
  `UsageModelKind.FREE` and the quantities fns are compiler-synthesized.
- **The body is relayed verbatim** — no `fromResponse`, no `fromError`.
  The vendor's error envelope is a flat `{error: "<message>"}`.
- **Recorded fixtures** (2026-11-18, `deno task record`): a 200 for
  `gymshark.com`, a 404 for an untracked domain, and a 401 for an
  unknown key.

## Capabilities

- `ecommerce-leads-connector`.

## Non-goals

- **Store search, charts, and exports** (`POST /api/stores/search`,
  `GET /api/stores/chart`, `POST /api/stores/export`) — a later change
  after usage data.
- **Contact reveals** (`/api/reveals*`) — these spend Ecommerce Leads
  credits and keep per-account reveal state. One shared Monid key would
  share that state across every Monid workspace. A later change can add
  them with a credits pool and the vendor's `charged` field as the claim.
- **Account-scoped tools** (watchlists, signal sets, outreach status) —
  per-account state, unsafe behind one shared key.

## Impact

- New: `connectors/ecommerce-leads/**` (provider, 1 endpoint, 3
  fixtures, 1 test file), `connectors/ids.lock.json` (+1 id), this
  change.
- No schema / engine contract change; `ENGINE_VERSION` untouched.
