# kosa8 Cloud

Sealed microVM sandboxes for AI agents, from
[kosa8 Cloud](https://docs.kosa8.com/guides/cloud/) (`https://api.kosa8.com`,
`Authorization: Bearer k8c_live_…`, read from `KOSA8_API_KEY`).

## Model

A sandbox is an **owned resource**, `kosa8/sandbox`. Monid holds one pooled
kosa8 organization, so every sandbox-scoped endpoint pre-gates ownership, and
the org-wide `GET /v1/sandboxes` list is never relayed.

| Endpoint               | Upstream                        | Binding    | Run price |
| ---------------------- | ------------------------------- | ---------- | --------- |
| `kosa8#create-sandbox` | `POST /v1/sandboxes`            | provisions | free      |
| `kosa8#exec`           | `POST /v1/sandboxes/{id}/exec`  | uses       | free      |
| `kosa8#get-sandbox`    | `GET /v1/sandboxes/{id}`        | reads      | free      |
| `kosa8#sleep-sandbox`  | `POST /v1/sandboxes/{id}/sleep` | uses       | free      |
| `kosa8#wake-sandbox`   | `POST /v1/sandboxes/{id}/wake`  | uses       | free      |
| `kosa8#delete-sandbox` | `DELETE /v1/sandboxes/{id}`     | releases   | free      |
| `kosa8#list-templates` | `GET /v1/templates`             | none       | free      |

The money is on the resource. kosa8 bills per second (worker `billing.js`
`RATES`, also served at `GET /v1/pricing`), and the resource's rate card has the
same three terms:

| Line               | Rate                                | Quantity             |
| ------------------ | ----------------------------------- | -------------------- |
| `vcpu`             | $0.048 per vCPU-hour, while running | vCPU-seconds         |
| `memory`           | $0.0154 per GiB-hour, while running | GiB-seconds          |
| `snapshot-storage` | $0.08 per GiB-month (730 h), asleep | snapshot GiB-seconds |

Each is multiplied by the region factor: `eu` 1.0 (eu-hel1, the only live
region), `us` and `ap` 1.2. `reconcileUsage` reads the sandbox's own lifetime
counters (`running_s`, `asleep_s`, `cpus`, `mem_mb`, `sleep_bytes`, `region`)
and applies that formula per line. Lifetime equals "this period" because
`/create-sandbox` requires `ttl_s` ≤ 28 days, so kosa8 deletes every sandbox
inside its first one-month period. After deletion the id route answers 404, so
the meter falls back to `GET /v1/sandboxes?all=1`, which keeps deleted rows.

`/delete-sandbox` deletes upstream immediately (a per-second meter cannot wait
for a release lead); `lifecycle.release` repeats the DELETE and tolerates 404.

## Left out

- File endpoints (`/v1/sandboxes/{id}/files…`), streamed exec, checkpoints,
  rewind and fork: they need the host data plane, which kosa8's production hosts
  do not have yet (the worker answers 501 `not_available`).
- Ports, network policy, `PATCH` (would let a TTL outgrow the billing period),
  Store items (`creator/name` templates, `accept_price`), functions, and the
  org-wide list.

## Fixtures

Every fixture is **synthetic**: constructed by hand from the worker source
(`workers/cloud-api/src`: `sandboxes.js` handlers and `publicSandbox`,
`billing.js`), not recorded. No live key was used. Template sizes and image
references in `synthetic-list-templates.json` are illustrative; real sizes come
from each host's template config. Endpoint fixtures sit next to their endpoint
(`endpoints/<name>/fixtures/`), the resource's under
`resources/sandbox/fixtures/`.

Every endpoint suite has a live test, gated on `KOSA8_API_KEY` via
`liveSkip("kosa8")`, asserting shape only. `list-templates` creates nothing.
Every other live test creates its own sandbox through `live-sandbox.ts` (the
`base` template, `ttl_s` 300) and deletes it in `finally`, so a failed assertion
never leaves a billed sandbox running; the wake test sleeps its sandbox first.
