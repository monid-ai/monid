# Proposal: add-connector-trdefi

## Why

Agents that pick a stablecoin route need to know what liquidity actually
exists right now: which positions are open, on which networks, at what depth,
and what a fill against one of them would return. A price feed answers a
different question - it prices a token, not a specific position, and it
cannot say whether the position is reachable for the caller.

TRDEFI exposes a live catalogue of non-custodial liquidity positions and an
on-chain simulated fill quote for each one. The catalogue has `defi`,
`yields` and `onchain-data` leaves, but no endpoint that returns an open
position with its maker quote, and no endpoint that prices a fill against a
position the caller could actually take.

Mechanically it is an easy fit: one base URL, no credential at all, six GET
endpoints and a `{ data, meta }` envelope. No new engine capability is
necessary.

## What Changes

- **connectors/trdefi**: six keyless, free, read-only endpoints against
  `https://yield.trdefi.com`: `GET /api/stats`, `/api/chains`,
  `/api/strategies`, `/api/strategy-detail`, `/api/quote` and `/api/badge`.
- **No credential is involved.** The read surface is public, so `auth.inject`
  passes the request through untouched and `credentials` is the empty shape -
  the engine requires no env var and validates nothing.
- **The write path is deliberately out of scope.** `POST /v1/positions` and
  `POST /v1/swaps` return unsigned transactions for the caller's own wallet
  to sign and are paid per request in USDC via x402; they are not exposed
  here.
- **A gated position is a coverage limit, not a failure.** A maker may gate a
  position on the caller holding an access licence token, and the catalogue
  answers `422 UNPROCESSABLE` with `Strategy is gated`. The endpoint
  description says so, and `quote_ready` is documented as a filter rather
  than a guarantee.
