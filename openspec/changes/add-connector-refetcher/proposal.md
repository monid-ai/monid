# Proposal: add-connector-refetcher

## Why

Refetcher exposes public social-media data through one authenticated JSON API.
Separate catalog tools make its platform/resource choices discoverable without
requiring callers to learn the unified request router.

## What Changes

- Add `connectors/refetcher` with eleven synchronous tools: Instagram post and
  profile, TikTok video and profile, Facebook post and profile, X post and
  profile, and YouTube video, channel and channel videos.
- Give every tool a distinct logical `endpoint` while sending its request to
  `POST https://api.refetcher.com/`. Authenticate through the existing
  `X-API-Key` header and `REFETCHER_CREDENTIALS_API_KEY` convention.
- Restrict this initial connector to one target and one billable page per run.
  Profiles use `pages: 1`; YouTube channel requests permit no more than twelve
  recent videos. These are connector bounds, not the limits of Refetcher's API.
- Declare the published USD rate, $0.0009 per successful result, through a
  metered model. An HTTP 200 alone is not billable evidence: a failed result
  in the response body settles at zero.
- Preserve the normalized response envelope, nullable metrics, availability
  markers, pagination details and media links. No output transformation
  substitutes guessed values for unavailable data.
- Add fixture-replay coverage and opt-in live tests gated on credentials and
  explicit target inputs. Four scrubbed recordings cover representative
  authenticated successes; constructed boundary/error fixtures remain labelled
  synthetic. A separate HTTP 401 fixture records an unauthenticated request;
  no key was sent and no paid scrape ran for that fixture.
- Qualify all eleven tools through the compiled engine on 2026-09-22: every
  tool completed one HTTP 200 request with a successful target result and
  $0.0009 USD usage. This smoke test covers the selected targets at that time,
  not an SLA or every possible target.

## Capabilities

- `refetcher-connector`.

## Non-goals

- Batch targets, multi-page reads, cursor-following and people search.
- Exposing the provider account's balance, account administration or payment
  methods to tool callers.
- Provisioning a Monid supplier account or defining negotiated commercial,
  commission, settlement or payout terms. The public API rate in the connector
  is not an agreement about those matters.
- Copying Refetcher's server or billing implementation, changing its production
  service, or changing Monid's engine/schema contract.

## Sources

Public [API documentation](https://www.refetcher.com/docs) and
[pricing](https://www.refetcher.com/pricing), reviewed 2026-09-22.

## Impact

New connector files and this OpenSpec change. The existing engine's request,
authentication and usage hooks cover the integration; no engine version bump
is required.
