# Proposal: add-connector-computesdk

## Why

ComputeSDK (computesdk.com) is one API for isolated Linux cloud sandboxes
across E2B, Daytona, Modal, Blaxel, Tensorlake, Beam, Archil and Sail. An
agent creates a sandbox, runs commands, reads and writes files, runs
background processes, exposes a port as a public URL, and destroys it.
There is no Monid connector that routes sandboxes across providers yet.

A sandbox is a durable, billable thing the workspace owns, so it is modeled
as a RESOURCE (the saperly `phone-number` pattern), not as per-call work.
ComputeSDK bills a sandbox by the second it runs at a provider/size rate;
operations inside it have no fee.

## What Changes

- **connectors/computesdk** — bearer auth, base URL
  `https://platform.computesdk.com`, 14 endpoints, all `FREE`:
  - Placement: `/get-options` (providers, sizes, hourly rates),
    `/get-quote` (placement + price for a size).
  - Lifecycle: `/create-sandbox` (PROVISIONS `computesdk/sandbox`),
    `/get-sandbox` (READS), `/list-sandboxes` (READS, served from the
    ownership window only), `/destroy-sandbox` (RELEASES).
  - In-sandbox, each USES `computesdk/sandbox` keyed `$.body.sandboxId`:
    `/run-command` (buffered JSON via a static `Accept: application/json`;
    the route streams SSE otherwise), `/read-file`, `/write-file`
    (`mkdir: true` makes a directory), `/delete-path`, `/start-process`,
    `/get-process`, `/kill-process`, `/get-sandbox-url`.
- **Resource `computesdk/sandbox`** — `data {provider?, size?, region?,
  label?}`; `verify` / `release` / `refresh` against
  `GET`/`DELETE /api/v1/sandboxes/{id}`. Rate card: period `DAY`
  (`CREATION_TIME`), one ESTIMATED line `compute` priced per `SECOND`
  (card shows $0.00604/hr, Agent37 medium, the cheapest live managed rate), reconciled every
  hour from the sandbox's own `cost.rate` and its `createdAt` /
  `destroyedAt` overlap with the window. A BYOK sandbox (no rate) reconciles
  to 0.
- **Category leaf** `virtual-machines` in `connectors/categories.ts`.
- Fixtures: `live-` options / quote / create recorded with
  `deno task record` (2026-11-13). Resource-bound calls are `synthetic-`:
  the ownership gate stops the recorder before upstream, so their bodies
  are taken verbatim from live REST runs (2026-11-13, 2026-11-21) against
  a local owned id.

## Capabilities

- `computesdk-connector`.

## Non-goals

- Provider-level credits or per-call pricing: the sandbox resource carries
  the only charge.
- Org administration, billing, actions and benchmark routes on the same API.
- Process stdin / wait, snapshots, checkpoints, port forwarding.

## Impact

New connector tree plus one category leaf. No schema/engine contract
change — `ENGINE_VERSION` unchanged, no new `Unit`, preset or hook.
