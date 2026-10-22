# Tasks: add-connector-typesafe

## 1. Port

- [x] 1.1 Read monid-services `adaptors/typesafe` and docs.typesafe.ai/api
      and /models
- [x] 1.2 `provider.ts`: base URL, bearer auth, 30 s timeouts, dollar pool
- [x] 1.3 `systemone`: vendor-mirror schema, `model` default at the binding,
      per-token usage with the byte-length estimate

## 2. Identity and tests

- [x] 2.1 Add `typesafe#systemone` to `connectors/ids.lock.json`
- [x] 2.2 Synthetic fixtures + `endpoints/systemone/endpoint.test.ts`
      (settle, 422, schema gate with near-twins, ASCII and
      non-ASCII estimate)
- [x] 2.3 `deno task check && deno task test`

## 3. Follow-ups

- [ ] 3.1 Record real fixtures with a TypeSafe key (`deno task record`)
- [ ] 3.2 `assets` and `box`, once the engine carries image input (#170)
