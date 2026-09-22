# Proposal: add-apify-johnvc-actors

## Why

Monid's apify connector carries 46 third-party actors; none are the Apify
Store actors published by `johnvc` (John Cole), a catalog of 100+ pay-per-event
data APIs that Monid invited into the connector standard ("connect to the
ones that have some rating and usage", 2026-09-22). This change ports the
first tranche: the 18 actors that clear a rating-and-usage bar (at least one
Store review and 30+ distinct users in the last 30 days) after removing overlaps with tools Monid already lists.

Every actor is `PAY_PER_EVENT` with a published Business-tier card, so each
one is pure endpoint data under the existing provider lifecycle. The fleet's
event naming does surface two gaps in the drift suite's derived join —
flat fees named `setup`/`startup`, and two published events that normalize
onto one id — and this change closes both without touching the schema, the
compiler, or the engine.

## What Changes

- **18 endpoints under `connectors/apify/endpoints/`** — new platform groups
  `apple`, `baidu`, `energy`, `government`, `naver`, `workday`,
  `yandex`; the rest under `google` and `youtube`. Ids are the actor's own
  Store slug, lower-cased (`apify#johnvc/<slug>`, endpoint paths are
  lowercase by schema); `request.path` carries the slug verbatim. Every doc
  pins the WHOLE
  published card (D29) at the Business-tier (GOLD) rates read from
  `/v2/acts/{id}` `pricingInfo` on 2026-09-22, including the platform's
  per-row `apify-default-dataset-item` line wherever it is published (D5).
- **Scaffolded mirrors.** `schema/inputs.ts` and `schema/output.ts` are the
  scaffold's output from each actor's published input schema and dataset
  fields (fetched token-free from the public build endpoint), curated only
  where the scaffold emits `z.any()` for a published `["string","array"]`
  type or a `stringList` editor.
- **Five billing archetypes, each with a deduced estimate (D25):** page-based
  cards where the page cap is required at the binding (`.unwrap().min(1)`
  plus the actor's verified published default); per-result cards; one leaf
  per-result doc (`fuelprices`); multi-line
  cards whose input switches select the billed line (`google-lens-api`
  `search_type`, `google-hotels-search-scraper` `search_type`,
  `google-local-services-api` `dataCid`, `google-flights`
  `fetch_booking_options`); and per-query cards. Multi-metered docs carry
  their own `usage.evidence`, reading the actor's own error-row marker so
  uncharged error rows are not billed on the main line while the per-row
  platform line always counts every row.
- **Two drift-suite edits** (`scripts/drift/apify.ts`, with tests): D1 —
  `FLAT_EVENT` recognizes `setup` and `startup` as once-per-run fees; D2 —
  a composite line's live price is the SUM of every published event
  normalizing onto its id (`apify-actor-start` + `actor_start` on
  `naver-search-api`).
- **Four category leaves**: `image-search`, `academic-search`, `events`,
  `government-data`.
- `test-inputs.json` rows and `CHAIN_COUNTS` rows for the multi-metered
  docs; estimate spot checks per archetype and per input-gated line.

## Capabilities

- `apify-connector`.

## Non-goals

- The rest of the johnvc catalog is a stack: tranche 2 (rated actors with
  10–29 monthly users, earnings-call transcripts, and the Tier-A actors
  held back for overlap — google-jobs pay-per-result, google-shopping-api,
  crunchbase-company-api, linkedin-people-search, Google-AI-Overview and
  google-maps-places), and a gap-fill tranche (unrated actors with no
  Monid equivalent, notably the ATS family: Greenhouse, Ashby, Taleo,
  JazzHR, iCIMS, SuccessFactors, Paylocity, isolved).
- No `usage.consolidate`: the apify provider deliberately settles on the
  declared card (owner decision 2026-09-17).
- No live tests; no new fixtures — the provider's shared chains serve every
  new doc.

## Impact

New endpoint trees, four category leaves, two drift-suite edits with tests.
No engine, `shared/`, `config.yml` or `ENGINE_VERSION` change.
