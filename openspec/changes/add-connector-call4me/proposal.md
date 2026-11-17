# Proposal: add-connector-call4me

## Why

A lot of real-world errands still end in a phone call: booking a doctor or a
table, rescheduling a car service, asking a store whether something is in
stock. The catalog has `agentic-phone` (saperly), but saperly is a carrier:
the agent rents a number, writes a persona and runs the call itself. No
endpoint takes "call this business and get this done" and returns the
outcome.

call4me does that. An AI caller phones the business, gets through phone
menus and hold, holds the conversation, and returns a structured outcome, a
recap and the transcript. It is prepaid and billed per answered minute,
and each finished call reports its own charge.

Mechanically it fits the existing async run protocol (the saperly
place-calls posture): one base URL, bearer auth, a POST that starts the call,
a GET that long-waits on it, a hang-up. No new engine capability is needed.

## What Changes

- **connectors/call4me**: 3 endpoints against `https://call4.me/api`, bearer
  auth (`cb_live_…` keys), published OpenAPI at
  https://call4.me/api/openapi.json (v1.3.0):
  - `call4me#requirements` (`GET /requirements`): the call categories. FREE.
  - `call4me#requirements/{category}` (`GET /requirements/{category}`): what
    a kind of call needs before dialing. FREE.
  - `call4me#calls` (`POST /calls`): the metered async run. The run is the
    call. `start` posts the body, `poll` long-waits on
    `GET /calls/{id}?wait_seconds=20` until `finished` (the call ended and
    its recap and final `cost_cents` are written), and `stop` hangs up
    (`POST /calls/{id}/hang-up`, where 409 "not live" and 404 count as
    already ended) and then waits for the finished record, so a stop settles
    the metered work (D34) or returns UNRESOLVED.
- **Billing is the call's own meter.** Rate card (https://call4.me, checked
  2026-10-16): $0.25/min in the US, Canada and Europe, from pickup by a person
  or a phone menu, rounded up. Hold time is half price, unanswered calls are
  free, and other destinations have their own rate. Minutes × $0.25 is
  therefore only an approximation. The model is PER_UNIT `CREDIT`, one US
  cent per unit, against a `default` pool in US dollars, which is the
  firecrawl agent posture. Evidence and the consolidate claim both read
  `cost_cents`, so they agree by construction. The estimate holds
  `25 × max_minutes` cents at admission, and it re-runs every 30 s
  (`updateEstimateEveryMs`) to cover the elapsed minutes, because call4me
  keeps a call on hold past its cap.
- **Pooled tenancy.** Monid holds one call4me account for every workspace,
  so the connector stays off account-wide surfaces:
  - The binding omits `connect_when` and `listen_in`, which ring the
    account profile's phone, and `from`, which picks one of the account's
    numbers.
  - It requires `on_behalf_of`, because the vendor defaults it to the
    account profile's name.
  - It requires `max_minutes`, the cap the caller states and the hold the
    estimate prices.
  - `call4me#requirements/{category}` projects away `from_profile` and
    `known`, which describe the shared account's saved profile.
- **Faithful mirror.** `endpoints/calls/schema/inputs.ts` mirrors the
  OpenAPI request body with optionality only, as a strict object (the vendor
  sets `additionalProperties: false`).
- **Errors.** A provider `output.fromError` digests `{error}` into
  `{message, raw}`. The 422 "Not calling yet" refusal lists exactly what to
  ask the user, and it settles at zero.
- **Fixtures.** Real recordings for all three endpoints. One is a live call
  to NIST's public talking clock, hand-minimized from 10 exchanges to 3. It
  settled at `cost_cents` 50. Synthetic provider-level chains cover the 422
  refusal, a stop that settles, and a stop that stays UNRESOLVED.

## Capabilities

- `call4me-connector`.

## Non-goals

- `POST /calls/{id}/answer` (answer the caller's mid-call question) and
  `POST /calls/{id}/connect` (patch the user in). Answering needs a
  run-scoped way to address a live call that a workspace owns, and connect
  rings the account profile's phone. Until then, the description tells the
  agent to give the caller every fact and the flexibility it may use up
  front.
- `GET /calls`, `GET/PATCH /profile`, `GET /balance`, the number routes and
  scheduled calls all act on the shared account (other workspaces' calls,
  one profile for everyone, one balance, one set of numbers). A scheduled
  call would also dial outside any run.
- `GET /calls/{id}` and `GET /calls/{id}/recordings` as standalone reads.
  The run already returns the finished record, and a bare id read has no
  ownership gate.

## Impact

New connector tree and 3 new ids in `connectors/ids.lock.json`. No new
`Unit`, preset, hook or category, and no compiler or engine change.
