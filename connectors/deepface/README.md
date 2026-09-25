# deepface.dev connector

This is a proposed **dedicated Monid contract**, `monid_v1`, not a mirror of
deepface.dev's ordinary prepaid prices and not an active commercial agreement.
The connector must remain unpublished in the hosted catalog until the backend
and account activation checklist below is complete.

| Endpoint             | Credit draw per successful call | Provider USD per 1,000 calls | Integer microUSD per call |
| -------------------- | ------------------------------: | ---------------------------: | ------------------------: |
| `deepface#represent` |                            1.02 |                         1.02 |                      1020 |
| `deepface#verify`    |                             1.8 |                         1.80 |                      1800 |
| `deepface#compare`   |                           0.044 |                        0.044 |                        44 |

The broker must configure the `default` credit pool at **USD 0.001 per credit**.
That is the provider's receivable, not a promise of Monid's end-user retail
price. Monid's platform, payment, FX, and applicable collection charges must be
funded separately by Monid/users, not deducted from that receivable. Commercial
agreement and broker configuration are deployment prerequisites; this repo
cannot enforce another platform's fees, payout terms, or taxes.

Every HTTP 2xx draws the fixed rate, including a valid `verified: false` or
non-match. Every non-2xx draws zero. There is no free allowance on this
dedicated contract. A transport timeout can leave execution unresolved;
reconcile the provider ledger before retrying rather than treating absence of a
response as proof of a free call. The connector does not retry automatically.

The provider-level synchronous relay sends the host's validated UUID `runId` as
`x-request-id`. Hosted execution must supply and preserve the same UUID across
activity retries. A fresh standalone `run()` creates a new UUID and is a new
operation, not a safe retry. Reusing an already reserved UUID returns a
non-billable HTTP 409, **not** a replay of the prior answer. The host must
reconcile the original operation instead of marking that 409 as proof that the
original work was free. Invalid host IDs fail before a network request.

## Scope and safety

- `represent`: one base64 image, an explicitly selected approved model.
- `verify`: two base64 images, an explicitly selected approved model.
- Both use fixed OpenCV detection, detection enforcement, alignment, and base
  normalization. Arbitrary model, detector, remote URL, and path inputs are
  rejected by the compiled input schema.
- `compare`: exactly one source and one target vector, synchronous only. Image
  comparisons, batches, aliases, and async jobs are not included in the low
  vector-only rate. Each vector has at most 512 numeric elements; gateway/model
  validation enforces matching dimensions and valid metrics.
- The gateway still enforces request, decoded-image, pixel, concurrency, rate,
  account-spend, and model allowlist limits. Connector validation is not a
  substitute for those controls.
- Images/embeddings are sensitive biometric information. Use only data for which
  the caller has appropriate rights and consent, minimize retention, and keep
  payloads out of operational logs. This connector does not identify strangers,
  search a face database, or establish legal identity/liveness.

## Activation gate

1. Deploy the deepface.dev backend migration and gateway supporting the exact
   `monid_v1` rate map and `x-deepface-billing-profile: monid_v1` check **before
   computation**. A prepaid account, different tariff, inactive contract, or
   unsupported workload must fail closed with a non-2xx response.
2. Provision a dedicated Monid account, initially suspended, with verified
   billing details, a finite spend cap, the exact endpoint rates above, and
   agreed payment/settlement arrangements. Do not reuse a Workweek or personal
   prepaid key. Activate only after the commercial setup is approved.
3. Configure the broker's credit conversion and fee pass-through independently.
   The connector's credit values do not configure payout or retail pricing. The
   agreement must also cover valid provider-ledger charges when Monid loses the
   response or the client disconnects. Monid must reconcile those uncertain
   outcomes and remain responsible for captured provider charges; zero usage on
   a broker error is not proof of no provider liability. Confirm durable
   request-ID propagation and reconciliation before hosted activation.
4. Store the dedicated key in the host's credential store. For local gated
   testing the name is `DEEPFACE_CREDENTIALS_API_KEY`; never commit it. Run
   `deno task test:live connectors/deepface` and an authorized image smoke test,
   then reconcile the actual provider ledger with Monid's settled usage.
5. Release/ingest the tested catalog using this repo's documented catalog
   release workflow. A merged PR alone is not evidence of hosted activation.

Rotating the tariff requires a new profile version and a coordinated broker /
connector / provider rollout. Do not silently change `monid_v1` prices in place.

## Test provenance

All committed fixtures are explicitly synthetic. The image placeholder is text
encoded as base64, not an inference-quality image; the embedding values are
invented. Replay tests prove compiled validation, rate-card folding, header
injection, and zero usage on error, not production readiness or face accuracy.
The gated live test uses only synthetic numeric vectors and makes one billable
comparison when an activated credential is supplied. No live image test runs
automatically or embeds someone's face in this public repository.

Source:
[deepface.dev canonical public API](https://github.com/techlocal-accounts/deepface/blob/main/openapi/deepface.openapi.yaml).
