# Proposal: add-connector-particle

## Why

Particle (particle.pro) is a podcast-intelligence API: 160,000+ podcasts
transcribed, diarized and speaker-identified, new episodes searchable
within minutes of airing, with entity mentions, guest expertise,
sponsorship data and rankings on top. The catalog has news search and
speech tools but no podcast data at all. Particle is REST, one API key,
and its pricing page publishes a fixed US-dollar list price per call for
every endpoint, so it maps onto a flat PER_CALL model with no new engine
capability.

## What Changes

- **connectors/particle** — 7 synchronous GET endpoints against
  `https://api.particle.pro`, `X-API-Key` auth, 60 s timeouts:
  - `particle#v1/podcasts/search` — find shows by name with topic,
    language, suitability, format and audience filters. $0.003.
  - `particle#v1/podcasts/{id}` — one show by slug or ID, with optional
    related / recommendation / coverage sections. $0.003.
  - `particle#v1/podcasts/{id}/episodes` — a show's episodes, by title
    text, date window and transcript status. $0.01.
  - `particle#v1/podcasts/episodes/search` — search inside episode
    dialogue by meaning (`semantic_search`), exact phrase
    (`keyword_search`) or both, with entity, speaker, segment-type and
    guest-expertise filters. $0.01.
  - `particle#v1/podcasts/mentions` — every line that mentions a person
    or company, grouped by episode. $0.015.
  - `particle#v1/entities/search` — resolve a name, ticker, @handle or
    domain to the slug the other endpoints take. $0.003.
  - `particle#v1/podcasts/episodes/{id}/transcript` — the diarized
    transcript of one episode (dialogue, text or SRT; speaker and time
    range filters). $0.01.
- **One credit pool** `default` ("US dollars") and a provider-level
  `PER_CALL` of $0.003; the costlier endpoints override only the amount.
  Amounts are Particle's list prices (particle.pro/pricing, Endpoint List
  Prices, Individual column, 2026-10-29): what an API-key account pays per
  call beyond its bundle. The OpenAPI `x-payment-info.price` is the keyless
  x402/MPP rate card, about 3x list, which a keyed account never pays.
  No `usage.consolidate`: no response body carries a receipt (the
  `Payment-Receipt` header is the keyless x402/MPP path, not used here).
- **`output.fromError`** on the provider: Particle answers RFC 7807
  problem+json; the digest lifts `error_code` and `detail` and keeps the
  envelope under `raw`.
- **One new category leaf** `podcasts` in `connectors/categories.ts`
  (the first podcast-data provider; `news-search` and `speech` do not
  describe it).
- Fixtures: recorded 2026-10-28 with a real key against the live API
  (`deno task record`, trimmed by the fixture diet), one happy chain per
  endpoint plus a recorded 401 (invalid key) replayed per endpoint.

## Capabilities

- `particle-connector`.

## Non-goals

- Alerts, transcription requests, the episode archive/stream/feed
  endpoints, and the keyless x402 payment path (an account surface or a
  payment protocol, not a per-call tool).
- The `speaker_statement_characteristics[...]` object-valued query
  filter on search and mentions: the engine sends scalar query values
  only (design D6). Named in `notes`; a follow-up can add a
  `toRequest` that flattens it.
- The remaining ~40 podcast, company, people and topic endpoints: this
  is the first slice, chosen so an agent can go name → show → episodes
  → dialogue → transcript, and name → entity → mentions.

## Impact

New connector tree plus one category leaf. No schema/engine contract
change — `ENGINE_VERSION` unchanged, no new `Unit`, no new preset, no
new hook.
