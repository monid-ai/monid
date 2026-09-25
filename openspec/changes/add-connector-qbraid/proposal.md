# Proposal: add-connector-qbraid

## Why

qBraid (qbraid.com) is a cloud platform for quantum computing. One API
key reaches QPUs and simulators across AWS Braket, Azure Quantum, IBM,
IonQ and qBraid's own backends, plus OpenQASM tooling and a free
state-vector simulator. qBraid applied to be a Monid tool provider and
was invited to open this connector PR (2026-09-21).

It is the first connector in the `quantum-computing` category, and the
first whose billable endpoint answers 201 for a REJECTED submission.

## What Changes

- **connectors/qbraid**: 13 endpoints over
  `https://api-v2.qbraid.com/api/v1` with the `X-API-Key` header.
  - Devices: `list-devices`, `get-device`, `get-device-calibration`.
  - Providers: `list-providers`.
  - OpenQASM tooling: `validate-qasm`, `parse-qasm`, `convert-qasm`,
    `simulate-circuit` (up to 20 qubits).
  - Jobs: `estimate-job-cost`, `submit-job`, `get-job`,
    `get-job-result`, `cancel-job`.
- **Ids are pinned slugs** (design D1). Four wire paths carry a `{qrn}`
  placeholder and two endpoints share `/jobs`, so a derived id would be
  ambiguous or unreadable.
- **The pool is qBraid credits, 100 credits = $1 USD** (design D3).
  Twelve endpoints are FREE. `submit-job` alone bills: the vendor's own
  `data.estimatedCost` is the claim, metered in millionths of a credit
  so the engine fold matches qBraid's 6-decimal prices exactly.
- **`submit-job` owns a `lifecycle.start`** (design D4). qBraid answers
  201 with `success: false` for a rejected submission; the start
  synthesizes a 502 so the engine bills it zero.
- **New category leaf** `quantum-computing` in `connectors/categories.ts`.
- **Real recordings** from 2026-09-22 for every endpoint's happy and
  error chains, scrubbed. Three fixtures stay `synthetic-` (design D8).

## Capabilities

- `qbraid-connector`.

## Non-goals

- **Account and organization routes**: account, organization, wallet,
  billing, membership, credit requests, API keys. They read or change
  the key owner's own account (design D2).
- **Job listing, deletion and groups** (`GET /jobs`, `DELETE /jobs`,
  `/jobs/group`, `/jobs/summary`, `/jobs/statuses`). Under a
  platform-held key every Monid caller shares one qBraid account, so a
  list would show one caller's jobs to another (design D2).
- **Compute servers, SSH keys, Lab storage, notifications, kernels,
  environments.** Stateful Lab resources, not data or compute calls.
- **Admin routes** (`/devices/admin`, provider ownership, device
  updates). Staff-only.
- **Program read-back** (`/jobs/{qrn}/program`, `/compiled-program`,
  `/program/ascii`) and `/jobs/{qrn}/restore`. Candidates for a later
  change once the core set is live.

## Impact

New connector tree plus one new category leaf. No engine bump, no new
`Unit` (`CREDIT` exists), no new preset (`presets.auth.header` carries
`X-API-Key`), no hook-ABI change. `connectors/ids.lock.json` gains the
13 `qbraid#…` ids and nothing else.
