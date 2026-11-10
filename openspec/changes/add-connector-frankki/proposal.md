# Proposal: add-connector-frankki

## Why

Agents get asked to send real paper letters: a cancellation, an objection to
a fine, a reply to a German authority. Nothing in the catalog prints and posts
one. FrankKi (frankki.app) does, to a street address in Germany or abroad, as
standard, tracked or registered mail. Six synchronous POSTs, one key, no new
engine capability.

## What Changes

- **connectors/frankki**: six endpoints on one host,
  `https://backend.frankki.app/api/v1/public/monid/letter`, auth
  `presets.auth.header("X-FrankKi-Lane-Key")`, 30 s / 35 s provider timeouts
  with per-endpoint overrides for rendering:
  - `frankki#quote`: postage for a country and page count, plus every method
    that country offers with its own price.
  - `frankki#address-check`: which recipient fields the carrier still needs.
  - `frankki#compose`: lays out and renders the letter, returns a private
    `draftToken` and `trackingToken`.
  - `frankki#preview`: rendered page images and the price.
  - `frankki#checkout`: a Stripe checkout link for the previewed draft.
  - `frankki#track`: postal status by tracking token.
- **FREE model** on the provider (D2). The user pays FrankKi on its own
  checkout; no call draws Monid balance.
- **Provider-level output hooks**: `fromResponse` unwraps FrankKi's
  `{status, code, data, requestId}` envelope; `fromError` maps it to
  `{message, code, raw}` (D3).
- **New leaf category** `postal-mail`.
- Fixtures: every happy path and every 401 is RECORDED against production
  (2026-10-27); the review hold (202) and the content refusal (422) are
  `synthetic-`.

## Capabilities

- `frankki-connector`.

## Non-goals

- Attachments. The vendor lane takes none from this caller.
- Charging letters through the Monid balance. That needs a commercial
  agreement and would change the model from FREE to a metered one.

## Impact

New connector tree and one category leaf. No schema or engine contract
change: `ENGINE_VERSION` unchanged, no new `Unit`, preset or hook.
