# Tasks: add-connector-typesafe

## 1. Port

- [x] 1.1 Read monid-services `adaptors/typesafe` (fa6ab6ac) and
      docs.typesafe.ai/api and /models
- [x] 1.2 `provider.ts`: base URL, bearer auth, 30 s request / 60 s run
      timeouts, dollar pool, `decision-models` category
- [x] 1.3 `systemone`: v1 schema and text, cardinality via `.meta()`,
      `model` default at the binding, per-token usage with the byte-length
      ceiling
- [x] 1.4 `categories.ts`: `decision-models` leaf (hosted manifest text)

## 2. Identity and tests

- [x] 2.1 Add `typesafe#systemone` to `connectors/ids.lock.json`
- [x] 2.2 `endpoints/systemone/fixtures/`: the v1 live drill + a
      synthetic unknown-model 422
- [x] 2.3 `endpoints/systemone/endpoint.test.ts`: settle (whole usage and
      output), 422, v1's rejection list with near-twins (2 and 10 levels,
      1 and 255 options), byte-count estimate, live answer keys
- [x] 2.4 `deno task check && deno task test`

## 3. Follow-ups

- [ ] 3.1 `assets` and `box`, once the engine carries image input (#170)
