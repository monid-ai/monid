# Proposal: add-connector-orbit

## Why

Every other people provider in the catalog answers a lookup: a match, a
contact, a record. Orbit answers a different question — *tell me about this
person* — and returns the deepest context it can assemble about them, with a
source behind every claim. That is the capability an agent reaches for when
the job is personalization or research rather than routing: choosing a gift a
friend will actually like, learning about someone before meeting them,
briefing itself on a client, or researching a person properly.

It fits the connector standard without stretching it: one base URL, bearer
auth, a published OpenAPI document, and an **unauthenticated JSON rate card**
at `GET /v2/developer/pricing` that pins every credit line in this change.

It is also the first connector whose vendor **reports no meter on the work it
bills**. Orbit's own settle turns on whether it BUILT a profile or merely read
one, and its public snapshot reports the depth reached without ever saying
which of the two happened. Firecrawl could lean on `creditsUsed`; exa on
`costDollars`; here there is nothing to lean on — so this change is the test
of whether a connector can derive an honest bill from OBSERVATION instead, and
of how the async lifecycle's fn-owned state carries a billing signal that
exists only while a run is in flight.

## What Changes

- **connectors/orbit** — 4 endpoints against `https://api.orbitsearch.com`,
  bearer auth (`sk_orb_` keys) needing only the `search:read` and
  `profile:read` scopes, one credit pool, a provider-level
  `output.fromError`, and no provider lifecycle.
  - 1 sync: profile read.
  - 3 async: search, enrich, batch enrich — each carrying its own lifecycle.
    Orbit's two status routes are the routes those lifecycles poll, not
    catalog endpoints: the engine drives every poll inside the run, so a
    caller never needs to read a search or an enrichment by id.
- **The poll is the meter (search).** Orbit charges 5 or 10 credits for a
  profile it BUILT and nothing for one it already held, and the two are
  indistinguishable in the terminal snapshot — both read `ready` at the depth
  asked for. The lifecycle records every id it observed `generating` or
  `enriching` into the fn-owned `state.data.built` bag, and `evidence` settles
  the depth line from those observations. A search answered entirely from the
  index settles its `index_search` blocks and nothing else.
- **Dispatch is the meter (enrich).** Orbit answers `202 running` exactly when
  it starts building and answers terminally on the submit when the profile is
  already at the requested depth. `start` records which happened;
  a no-op enrich settles at **zero**. `regenerate` rebuilds unconditionally
  and is recorded as dispatched however the submit answers.
- **Both derivations are TRUE LOWER BOUNDS, stated as such.** Work that Orbit
  both starts and finishes between two ticks is never observed and settles as
  a read. Scaling the count up to cover it would invent work we did not see,
  and D27 is explicit that unobserved entries are omitted rather than guessed.
  The bound errs toward the caller, and a vendor claim closes it exactly the
  day an Orbit snapshot carries its own settled charge.
- **The batch fans out.** Orbit's batch has no parent status route: the submit
  returns one child `request_id` per profile and each reads back on its own.
  The lifecycle polls only the children still running, then reads every child
  once more so the envelope carries one current snapshot per profile. Bounded
  by the vendor's own cap of 20, and child reads are free.
- **Estimates are ceilings, and they are the point.** `limit: 100` at full
  depth authorizes up to 1,010 credits while a typical cached search settles
  at 1. An agent that reads `estimate` before committing sees the difference;
  one that does not, finds out afterwards.
- 15 synthetic fixture chains and 23 replay tests, covering both zero-settle
  regressions (the cached search, the no-op enrich) explicitly, plus a
  runtime schema gate on every endpoint that takes an input.
- **Catalog positioning.** `discover` ranks on `meta.description`, so the
  copy is the product surface. The provider and endpoint descriptions name
  the jobs an agent actually arrives with — a person the user just
  mentioned, a prospect before outreach, a candidate or counterparty under
  diligence, the people behind a company being researched — while keeping
  "the deepest available context about a PERSON" as the spine rather than
  narrowing into a sales-tool pitch.

## Capabilities

- `orbit-connector`.

## Non-goals

- **Watchers are held back** (`POST/GET/PATCH/DELETE /v3/watchers`,
  `/v3/watchers/{id}/runs`). A watcher's charges — 1 credit per run, 5 more
  for a run that finds something new — accrue on Orbit's schedule for as long
  as the watcher lives, which is to say entirely outside the run that created
  it. Nothing in the settle pipeline can anchor that, and pretending a create
  call is free while it commits an open-ended draw is the one thing a billing
  model must not do. It arrives when the two platforms have agreed how a
  recurring charge settles.
- **Bulk search is held back** (`/v3/search/bulk` and its three reads) —
  pending an internal review on the vendor side rather than on any doubt
  about the shape. It is worth recording what that review starts from,
  because it is the opposite of the population case below: a bulk job
  reports `billing.consumed_credits`, its own cumulative charge after Orbit
  "releases unused credits", so it is the one Orbit surface a connector can
  settle EXACTLY rather than bounding from observation. It also exposes a
  cancel route, so a run that hits its budget can stop the undispatched
  remainder instead of leaving it to charge on.
- **Population search is held back** (`/v3/search/populations` and its
  quote), and this one is worth stating precisely because the endpoint LOOKS
  settleable. A population is priced as one number and reserved when the
  search starts — but Orbit then "settles them as the work completes, and
  releases what it did not use when the search ends"
  (`docs.orbitsearch.com/concepts/credits`). `credits_quoted` is therefore a
  CEILING, not a charge, and the public contract carries no settled figure
  anywhere. Billing the ceiling would overcharge every population that
  under-runs, and billing zero would hand out the work free. The free quote
  goes with it: a price an agent cannot act on is a dead end in a catalog.
  The pair arrives together once a snapshot reports what the search actually
  settled.
- **Webhooks are held back** (`/v3/webhooks`). The create response returns a
  plaintext signing secret exactly once, and a completed run is retrievable
  later with its full provider output — so the endpoint is unsafe to expose
  until field-level redaction is confirmed end to end. The other three webhook
  routes are not worth a connector on their own.
- Face-signal search is priced on Orbit's card and absent from the published
  request schema; it arrives with the schema.
- The company lines on the rate card price routes the public v3 document does
  not carry yet.
- No new category leaf: `people-enrichment` already exists.
- No dollar conversion in the doc. The published package tiers are not
  uniform, so a single $/credit constant would be fiction; the pool is
  Orbit's own credits and the conversion stays the broker card's job.

The four that remain are exactly the endpoints that settle inside their own
run — and, separately, the core of the request/response surface Orbit's own
agent skill (`docs.orbitsearch.com/skill.md`) and hosted MCP server publish
for this job.

## Impact

New connector tree. No new `Unit`, preset, hook, category or compiler change,
and no engine bump — `deno task version:check` reports no contract-surface
change. Fixtures carry the `synthetic-` prefix until they are recorded against
the dedicated provider key.
