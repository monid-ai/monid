# Proposal: add-connector-spicrawl

## Why

Spicrawl gives agents three things the catalog lacks in one place: a
continuously updated index of open job postings from thirteen boards and
applicant-tracking systems (nothing else in the catalog has one), a scrape that
turns any URL into clean markdown with rendering and bot-challenge escalation,
and a brand-kit read for a site. All three are JSON over HTTPS with bearer auth
and a vendor-reported credit meter, so nothing needs a new engine capability.

## What Changes

- **connectors/spicrawl** — 3 sync endpoints against
  `https://api.spicrawl.com/v1`, bearer auth: `spicrawl#scrape`
  (`POST /scrape`), `spicrawl#brand` (`POST /brand`), `spicrawl#jobs/search`
  (`POST /jobs/search`).
- **One credits pool.** `default` ("Spicrawl credits"); every endpoint is one
  `PER_UNIT` line on `Unit.CREDIT` at one credit per unit.
- **Vendor claim from the body.** The provider's `usage.consolidate` plucks
  `credits` (scrape, brand) or `credits_used` (job search) out of the payload
  and it becomes the claim; an absent field leaves the derived fold.
- **Scrape estimate deduced from the request**: plain 1, `js_render` 3,
  `mode: "auto"`, `solve_captcha` or `scroll_pages > 0` 8 (full browser), +5
  for a captcha solve, capped by `max_cost`. Brand is flat 8: a brand request
  is priced as full-browser rendering. `input.toRequest` pins `response_format: "json"` so the
  body is always the envelope that carries `credits`.
- **Strict bodies.** Each `schema/inputs.ts` mirrors the OpenAPI field for field
  but is `.strict()` and omits the fields below, so they cannot be passed.
- Real recorded fixtures (scrape, job search, provider error) plus one
  synthetic brand chain, as provider-level shared chains.

## Capabilities

- `spicrawl-connector`.

## Non-goals

- `/batch` — later.
- Browser/CDP — a websocket surface the engine has no transport for.
- `session_id`, `sticky_key`, `proxy` and related fields — Monid sends every
  user's call with one shared Spicrawl key, so session and network state would
  be shared across Monid users.
- `find_contacts` — it looks up real, named people.
- Webhooks and monitors — account configuration on a shared key.
- Account endpoints (requests, usage, key) — they would leak one user's data to
  another on the shared key.
- No new category leaves (`web-scraping`, `web-extraction`, `jobs` exist) and no
  dollar conversion: the pool is the vendor's credits.

## Impact

New connector tree only. No new `Unit`, preset or hook, no compiler or engine
change, so no `design.md`.
