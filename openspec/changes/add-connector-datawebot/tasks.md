# Tasks: add-connector-datawebot

## Connector implementation

- [x] Read the vendor's public OpenAPI and API reference (2026-11-23).
- [x] Add the bearer-authenticated provider, timeouts and the credit pool.
- [x] Add closed input mirrors for search, product and sites.
- [x] Add search and product on the request router with one shared
      start/poll lifecycle; add sites as a FREE read.
- [x] Bill on `meta.credits_used`; settle zero-credit failures as 502.
- [x] Remove `meta.credits_left` from outputs and errors.
- [x] Register only the three new identities in ids.lock.json.
- [x] Add shared synthetic fixtures and sealed-unit replay tests.
- [x] Add credential-gated live tests for all three endpoints.

## Verification

- [x] Format, lint and typecheck the connector; datawebot suite passes offline.
- [x] Full repository offline suite on 2026-11-23: 1330 passed, 0 failed,
      227 skipped.
- [ ] Existing ids.lock.json drift in main (bytedance, fundable, hunterio and
      others) is left for a separate change; this port adds only its own ids.

## Follow-up requiring a provider key

- [ ] Run the live tests and replace the synthetic fixtures with sanitized
      recordings (`deno task record`).
- [x] Follow the product `next_cursor` for variants past the first 100.
- [x] Remove only `$.meta.credits_left`, keeping shop fields of that name.
- [x] Validate `url` as a URI, matching the vendor schema.
- [x] Sites tests: INVALID_INPUT gate, provider-error replay, live shape.
- [x] Fixtures bind `{{request.origin}}`.
