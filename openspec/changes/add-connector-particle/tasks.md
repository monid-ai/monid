# Tasks: add-connector-particle

## 1. Provider + schemas

- [x] 1.1 provider.ts: X-API-Key auth, baseUrl, 60 s timeouts, one
      `default` pool in US dollars, provider-level PER_CALL $0.01 (no
      consolidate), problem+json `fromError`
- [x] 1.2 schema/common.ts: limit / cursor / refs / language / date
      bound / guest-expertise filters
- [x] 1.3 connectors/categories.ts: `podcasts` leaf

## 2. Endpoints (7)

- [x] 2.1 podcasts/search ($0.01, inherits)
- [x] 2.2 podcasts/{id} ($0.01, inherits; path + include/topic_limit)
- [x] 2.3 podcasts/{id}/episodes ($0.03)
- [x] 2.4 podcasts/episodes/search ($0.03)
- [x] 2.5 podcasts/mentions ($0.04)
- [x] 2.6 entities/search ($0.01, inherits; `q` required)
- [x] 2.7 podcasts/episodes/{id}/transcript ($0.03)

## 3. Fixtures + tests

- [x] 3.1 Record one happy chain per endpoint with a real key
      (`deno task record`, 2026-10-28), hand-minimized to
      `connectors/particle/fixtures/happy-*.json`
- [x] 3.2 Record the 401 (invalid key) once; replay it per endpoint
- [x] 3.3 Tests: provenance + pool + wire form, happy / 401 / estimate /
      schema gates per endpoint, live gated on PARTICLE_API_KEY

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / spec / tasks
- [x] 4.2 Verify: fmt · lint · check · test · ids:check · double-compile
      · catalog smoke
- [x] 4.3 ids.lock.json: the seven `particle#` ids added by hand to the
      HEAD lock (plain-sorted). `deno task ids:check --update` was NOT
      committed: on current main `ids:check` already reports 78 compiled
      ids missing from the lock (hunterio, keenable, litescrape, orbit,
      search1api, vaquill, magic-hour, renamed bytedance / fundable /
      suzanne routes) and 7 stale lock entries; that belongs in its own
      change.

## 5. Review

- [x] 5.1 CodeRabbit round 1 (2026-10-29): happy tests assert the
      fixture's result count or deep-equal the recorded body; live tests
      assert shape only (no amounts); the spec's single-field bounds
      (q/slug/guest filters 200 chars, search phrases 500, episode minutes
      0-10080, non-negative cadence and appearance counts) moved into the
      mirrors with gate cases; entities/search describes the spec's
      match_quality values (exact, strong, contained, fuzzy, description,
      speculative)
- [x] 5.2 Rate card repinned to Particle's LIST prices (particle.pro/pricing,
      Endpoint List Prices, Individual column, 2026-10-29): $0.003 search /
      get / entities, $0.01 episodes / episode search / transcript, $0.015
      mentions. The OpenAPI x-payment-info amounts first pinned are the
      keyless x402/MPP rate card (about 3x), which a keyed account never pays.

