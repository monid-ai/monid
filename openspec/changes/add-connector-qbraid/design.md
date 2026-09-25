# Design: add-connector-qbraid

Decision record for the qBraid connector. The source of truth for every
shape is the qBraid API itself (Express + valibot): request schemas from
`src/features/{device,composer,job}/validators.ts`, responses from the
controllers and `job/shared/serializers/*`, and live calls on
2026-09-22. Precedents: exa (sync POST + body), tinyfish (FREE model),
contextdev D3 (a vendor claim plucked and stripped), minimax (a
lifecycle that synthesizes a non-2xx for an in-body failure), pdl (a
404 as error-as-data).

## D1 — Ids are pinned slugs

Every endpoint sets `endpoint: "/<slug>"`. Derived ids would read
`qbraid#jobs/{qrn}/result` and would collide on `/jobs`, which serves
both the submit (POST) and, upstream, the job list (GET). The slugs match
the tool names of qBraid's own MCP server (`submit_quantum_job` becomes
`submit-job`, and so on), so an agent that knows one surface knows the
other. Folders are the slug.

## D2 — The surface is what is safe under a platform-held key

Monid calls with ONE qBraid key, so every Monid caller acts as the same
qBraid user in the same organization. The connector carries only routes
that stay correct under that:

- Reads of shared catalog data (devices, calibrations, providers).
- Stateless tools (the four composer routes, the cost estimate).
- Job routes addressed by a job QRN the caller already holds (submit,
  get, result, cancel). A QRN embeds a 24-hex-digit job id, so a caller
  reaches only the jobs whose QRNs it was given.

Routes that enumerate or mutate the key owner's state are excluded: job
list, bulk delete, job groups, account, organization, wallet, billing,
membership, credit requests, compute servers, SSH keys and storage (see
the proposal's non-goals). qBraid provisions a dedicated, funded
organization for Monid's key, so the owner's state is Monid's own.

## D3 — One pool of qBraid credits; only `submit-job` bills

qBraid meters one balance in credits. `CREDITS_PER_DOLLAR = 100`
(qbraid-api `billing/ai-chat/ai-chat.types.ts`), so 100 credits = $1 USD.
The provider declares one pool, `default`, labeled "qBraid credits", and
FREE as the default model. Twelve endpoints inherit FREE: every read,
the composer, the 20-qubit simulator, the estimate and cancel cost 0
credits upstream (observed on the live run).

`submit-job` overrides the model with `PER_UNIT` · `CREDIT`:

| fn | behavior |
|---|---|
| `consolidate` | plucks `$.data.estimatedCost` from the 201 envelope as the vendor's claim and strips it from the output |
| `evidence` | restates the same figure as `CREDIT: round(estimatedCost × 1e6)` |
| `estimate` | `{counts: {}}` — the price is a device fact the input cannot yield |

The line consumes `amount: 0.000001` per unit. The engine folds
`ceil(quantity / every) × amount`, and qBraid rounds credits to 6
decimals (`CREDIT_PRECISION_DECIMALS = 6`, qbraid-api
`shared/utils/number-utils.ts`). Counting whole credits would ceil 2.35
to 3 and ride out as a `mismatch` on every priced job; millionths fold
exactly.

The claim lives on the endpoint, not the provider, because `get-job`
returns the same `estimatedCost` field. A provider-level consolidate
would bill a job again every time it is read.

`estimate-job-cost` is the pre-run quote. Its description and
`submit-job`'s both tell the caller to price the job there first.

## D4 — A rejected submission is a provider error

qbraid-api's `createJob` controller answers 201 for every submission and
sets `success: newJob.success || false`. A declarative doc settles any
2xx as billable success, so `submit-job` declares `lifecycle.start`: it
relays the request, returns non-2xx responses verbatim, and synthesizes
OURS 502 / THEIRS 201 for a 2xx whose `success` is not `true`. The
engine then zero-bills it. A real rejection (unknown device) comes back
as 404 and needs no synthesis.

## D5 — Errors are data

Every qBraid failure is `{success: false, message, error: {code, …}}`.
The provider `fromError` digests it to `{message, code, raw}`. Observed
codes (2026-09-22):

| case | status | `error.code` |
|---|---|---|
| garbage key | 401 | `INVALID_API_KEY_FORMAT` |
| well-formed unknown key | 401 | `INVALID_API_KEY` |
| no key | 401 | `NO_VALID_AUTHENTICATION` |
| calibration for a simulator | 404 | `NOT_FOUND` |
| unknown job QRN | 404 | `NOT_FOUND` |
| submit to an unknown device | 404 | `NOT_FOUND` |
| cancel a job still initializing | 409 | `JOB_CANCEL_CONFLICT` |

`list-providers` answers 200 without any credential upstream; it is
listed for completeness and is not a key probe.

## D6 — Inputs mirror the qBraid validators

- `list-devices` query mirrors `deviceSchemas.listDevices`.
- The composer bodies are `{qasm}`, and `convert-qasm` adds
  `target_version` (`"2.0"` or `"3.0"`), snake_case as on the wire.
- `estimate-job-cost` sends `shots` as a string, as the route validates
  it.
- `submit-job` mirrors `QuantumJobCreateValidationSchema`: `shots` has
  a floor of 0 as upstream does, and `program` is one `{format, data}`
  or an array of up to 2000.
- `program.data` is `z.unknown()` with a non-null refine, mirroring the
  upstream `v.check`. A refine compiles to nothing in the JSON Schema,
  so only a missing `data` is rejected before the wire; `data: null`
  reaches qBraid and is its 400.

Shared fragments live in `connectors/qbraid/schema/`: `zQasmBody` and
the device and job QRN path params.

## D7 — Timeouts

Provider default 30 s request / 60 s run. The composer routes and
`submit-job` take 60 s / 90 s: they call qBraid's runtime service, and a
submit can wait on the device provider's intake.

## D8 — Fixtures are real recordings, three stay synthetic

Happy and error chains were recorded live on 2026-09-22 against a
funded organization, then scrubbed of internal ids (`_id`, `providerId`,
`organizationUserId`, `deviceId`, storage paths) and trimmed to two
array items. Three fixtures stay `synthetic-`:

- `cancel-job/synthetic-happy.json`: the free simulator finishes before a
  cancel lands, so the 202 success shape comes from the controller.
- `submit-job/synthetic-priced.json`: the recorded 201 re-priced to the
  observed QPU quote (265 credits for 100 shots on
  `aws:aqt:qpu:ibex-q1`). No paid job was submitted.
- `submit-job/synthetic-rejected-201.json`: the 201 with
  `success: false` case from D4, taken from the controller.

Live tests gate on `QBRAID_CREDENTIALS_API_KEY` and assert response
shape only. The live `submit-job` test runs on the free simulator
`qbraid:qbraid:sim:qir-sv` with 10 shots and costs 0 credits.
