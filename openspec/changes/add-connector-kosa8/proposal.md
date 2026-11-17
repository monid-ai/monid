# Proposal: add-connector-kosa8

## Why

kosa8 Cloud gives an agent a sealed microVM per sandbox: its own kernel, so
model-written or untrusted code runs behind hardware virtualization rather than
a shared container kernel. Agents need exactly this when they execute code, and
the API is small: create a sandbox, run commands in it, sleep or wake it, delete
it. A sandbox is also the textbook OWNED, metered resource ("a phone number, a
mailbox, a VM" — DEVELOPMENT.md), billed per second while it runs, so it uses
the resource lifecycle as designed rather than per-call pricing.

## What Changes

- **connectors/kosa8** — 7 endpoints against `https://api.kosa8.com`, bearer
  auth, 45 s / 60 s timeouts:
  - `kosa8#create-sandbox` (`POST /v1/sandboxes`, PROVISIONS `kosa8/sandbox`;
    `ttl_s` required, ≤ 28 days).
  - `kosa8#exec` (`POST /v1/sandboxes/{id}/exec`, USES; buffered only).
  - `kosa8#get-sandbox` (READS), `kosa8#sleep-sandbox` and
    `kosa8#wake-sandbox` (USES), `kosa8#delete-sandbox` (RELEASES; deletes
    upstream at once).
  - `kosa8#list-templates` (`GET /v1/templates`, unbound).
  - Every run is FREE; `cost_usd` (the pooled account's wholesale figure) is
    stripped from success outputs.
- **resources/sandbox** — `kosa8/sandbox`: one-month CREATION_TIME period,
  three ESTIMATED lines (`vcpu` $0.048 / vCPU-hour, `memory` $0.0154 / GiB-hour,
  `snapshot-storage` $0.08 / GiB-month) with hourly `reconcileUsage` meters
  that apply kosa8's own cost formula to the sandbox's lifetime counters;
  verify via the id route, release via a 404-tolerant DELETE.
- **New category leaf** `code-execution`.
- Fixtures are synthetic, built from the vendor's API source (no live key).

## Non-goals

- Files, streamed exec, checkpoints, rewind, fork (need a host capability not
  on kosa8 production yet), ports, network policy, PATCH, Store items,
  functions, and the org-wide sandbox list (pooled tenancy).

## Impact

New connector tree and one category leaf. No schema/engine contract change —
`ENGINE_VERSION` unchanged, no new `Unit`, preset or hook.
