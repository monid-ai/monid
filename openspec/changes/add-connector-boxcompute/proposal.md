# Proposal: add-connector-boxcompute

## Why

Agents often need a computer, not just data: somewhere to install a
package, run a script, build and test a project, start a server, or keep
files between tasks. The catalog has search, scraping, enrichment and
generation, but nothing where an agent can run code. BoxCompute gives an
agent its own Linux VM over a small REST API (customer Sandbox API v2,
https://app.boxcompute.ai/api/v2/openapi.json), billed per second while the
VM runs.

A VM is a durable, owned, billable thing, which is what the resource
lifecycle is for (`DEVELOPMENT.md` names "a VM" as an example). This is
the second resource connector after saperly, and the first whose rate card
is an ESTIMATED line: what a VM costs depends on how long it runs.

## What Changes

- **connectors/boxcompute**: base URL `https://app.boxcompute.ai`, bearer
  auth (`bc_live_…` keys), and a provider `output.fromResponse` that drops
  the pooled account's internals (`workspaceId`, `metadata`,
  `createdByApiKeyId`). No endpoint declares a credit pool, because every
  call is free (D6b rejects a pool that no endpoint draws from). The
  resource's line draws `default` in US dollars, as saperly's does.
- **Resource `boxcompute/vm`**: data `{size, name?, blockNetwork?}`.
  - `usage`: one DAY period (creation-anchored) and one ESTIMATED line,
    `compute`, carded at the Small rate of $0.000834 per MINUTE (a Large
    VM is 3x).
  - `reconcileUsage.compute`: hourly. It reads `GET
    /api/v2/sandboxes/{id}/costs` and counts each settled run and the
    running estimate for its share of time inside the window. After a
    delete it finds the VM's history (`dsb_…`) in `GET
    /api/v2/deleted-sandboxes` by `sandboxId`, so the post-teardown read
    works. A history over 1,000 runs (the API lists the oldest 1,000) or an
    unavailable running estimate throws, so the host settles later rather
    than billing short.
  - `lifecycle`: `verify` (404 or state `expired` is inactive), `release`
    (DELETE, with 404 counted as done), `refresh`.
- **9 endpoints**, ids named by action as saperly does, because the VM id
  travels in the body for the resource binding:
  - `create-sandbox` (PROVISIONS). Its `lifecycle.start` lists workspaces
    and creates the VM in the oldest one with a run-stable
    `Idempotency-Key` (`{runId}:create`). It then reads the VM every 5 s
    for up to 100 s:
    - `running` → 201.
    - still `pending` → 202. The VM is provisioned anyway, so it always
      has an owner.
    - `expired` (refused at the account limit) → a best-effort DELETE and
      a 429 with nothing provisioned.
  - `get-sandbox` and `list-sandboxes` (READS). `list-sandboxes` is
    served from `utils.resources`, never from the pooled `GET
    /api/v2/sandboxes`.
  - `run-command`, `list-files`, `open-preview`, `start-sandbox` and
    `stop-sandbox` (USES): declarative relays, with `toRequest` moving the
    id into the path. `run-command` caps `timeoutSeconds` at 240 (the API
    allows 900) so one call fits a 300 s request timeout, including waking
    a stopped VM.
  - `delete-sandbox` (RELEASES). Its `lifecycle.start` deletes at once,
    unlike saperly's deferred release: a VM should stop billing and free
    its slot in the pooled account now. 404 counts as deleted, and a 409
    is relayed with no release mark.
  - Every call is FREE. The VM's time is billed by the resource.
- **Category**: a new leaf, `code-execution`.
- **Fixtures**: real recordings against production made on 2026-10-26.
  - A real create the account limit refused (pending → expired → DELETE).
  - get, execute (exit 0 and exit 3), file list (found and missing),
    preview, start, stop (200 and 409), delete of a gone VM, live costs,
    and the deleted-VM cost chain.
  - Synthetic chains, built from real bodies: a create that reaches
    `running`, a create still `pending` after 100 s, a busy delete, and the
    cost-window cases.
  - Account identifiers are scrubbed, and the preview URL's bearer
    hostname is replaced (that preview was closed at once).

## Capabilities

- `boxcompute-connector`.

## Non-goals

- **File read and write endpoints.** `GET`/`PUT .../files/content` carry
  raw bytes (`application/octet-stream`). The transport sends JSON bodies
  and sniff-decodes responses, so binary content would not survive.
  `run-command` covers it (`cat`, or a heredoc), and the endpoint notes say
  so.
- Long-running operations (`.../operations`), the desktop (computer use),
  TCP services, checkpoints and logs. These can follow as separate
  endpoints.
- `xl` and `xxl` sizes, which depend on the BoxCompute account's plan.
- A live test. Every live call creates or wakes a billed VM.

## Known gap

`fixtures.ts` cannot replay a 204 until #199 lands: `new Response` refuses
a body on a null-body status. The two tests that replay BoxCompute's 204
DELETE (delete-sandbox's happy path, the resource's `release`) are written
but marked `ignore` behind `NO_CONTENT_REPLAY_BROKEN`. The refused-create test
replays the same 204, which `create-sandbox` survives because that cleanup
is best effort.

## Impact

A new connector tree, 9 new ids in `connectors/ids.lock.json`, and one
new category leaf. There is no new `Unit`, preset or hook, and no compiler
or engine change.
