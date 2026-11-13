# Proposal: add-connector-runcloud

## Why

Agents that build or test mobile apps have nothing in the catalog that can run
one. run.cloud hosts real iOS simulators and Android emulators behind a plain
REST API: start a device, drive it with taps, swipes, keys and text, read its
screen as an accessibility tree, read its logs, stop it. That is the loop an
agent needs to smoke-test an app, reproduce a bug report, or check a flow end
to end, with no Mac and no emulator on its own machine.

It is the second resource-backed provider after saperly, and the first whose
resource is metered by time rather than rented: a session costs $0.02 per
active minute (https://run.cloud/pricing), metered per second from create until
release or timeout. The resource model already expresses that as an estimated
line with a reconciler, so the port needs no engine change.

## What Changes

- **connectors/runcloud**: provider `runcloud` against `https://api.run.cloud`,
  bearer auth (`RUNCLOUD_CREDENTIALS_API_KEY`, alias `RUNCLOUD_API_KEY`), and a
  provider-level projection on both output slots that deep-strips the pooled
  account's `orgId` and the fleet's `leaseId` / `device` / `hostId`.
- **Resource `runcloud/simulator-session`**: data `{platform}`; a DAY clock
  (a session lives at most 195 minutes, so it never crosses a period); one
  ESTIMATED line `active-time` priced at $0.02 per MINUTE; `reconcileUsage`
  re-derives run.cloud's own bill from the session payload, which carries every
  input of it (`createdAt`, `releasedAt`, `leaseId`): floor of the billable
  seconds at $0.02/60, zero for a session that never got a device.
  `lifecycle.verify` reads the session; `lifecycle.release` is an idempotent
  `DELETE` that settles a pending release by re-reading.
- **11 endpoints, all FREE** (the session's time is the whole cost):
  - `/start-session` PROVISIONS (lifecycle start sends
    `Idempotency-Key: {runId}:start`, so a retried activity gets the same
    session back); short by default: 5 minutes idle, 30 minutes total, and an
    idle timeout of `none` is refused at the binding.
  - `/stop-session` RELEASES and issues the `DELETE` itself: unlike a prepaid
    number, a session meters until released, so the meter must stop in the run.
  - `/tap`, `/swipe`, `/type-text`, `/press-key`, `/press-button`, `/open-url`
    USE the session (each success marks a reconcile tick). The five
    interactions share the vendor route `.../interactions` and stamp their own
    `action` in toRequest.
  - `/get-session`, `/read-screen`, `/device-logs` READ it. `/read-screen`
    flattens the accessibility tree in screen order, skips textless
    containers, caps at 400 elements and adds each element's normalized
    `center`, ready for `/tap`.
- **Category leaf `mobile-simulators`**: no existing leaf names devices;
  `agentic-phone` is telephony.
- 16 synthetic fixture chains and 23 replay tests.

## Capabilities

- `runcloud-connector`.

## Non-goals

- **Screenshots** are held back. run.cloud answers `GET .../screenshot` with
  raw `image/png` bytes, and the engine's transport decodes every body as text
  (`response.text()`), which corrupts binary. It lands when either side offers
  a JSON-safe form (a base64 variant upstream, or binary-safe decoding here).
- Uploads, screen recordings, camera/microphone injection, Xcode builds,
  saved states, Metro tunnels, scroll/gesture/rotate and the other
  interactions, tags, and keep-alive: a tight first surface.
- Listing sessions: the account is pooled, so a list would show every
  workspace's sessions (saperly's pooled-tenancy rule).

## Impact

New connector tree, one category leaf, twelve new ids in
`connectors/ids.lock.json`. No schema, engine, preset or compiler change, so no
version bump.
