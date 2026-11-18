# Tasks: add-connector-ecommerce-leads

## 1. Decisions (vendor, 2026-11-18)

- [x] 1.1 Ship the free lookup only; no credit-spending endpoint yet
- [x] 1.2 FREE usage model at the provider level

## 2. Provider

- [x] 2.1 `provider.ts`: meta + 2 notes, Bearer preset, base URL with
      the `/api` prefix, 15 s request / 20 s run timeouts, FREE model

## 3. Endpoints (1)

- [x] 3.1 `stores/lookup`: strict `domain` query mirror, no projection

## 4. Verify

- [x] 4.1 `endpoint.test.ts`: compiled url / FREE slots / single id; happy
      relayed verbatim at zero usage; 404 and 401 as data; strictness; one
      gated live case
- [x] 4.2 `deno task check` / `test`, `ids:check`
- [x] 4.3 `deno task record` the happy, not-found, and unauthorized
      scenarios (2026-11-18); `deno task test:live` green

## 5. Openspec

- [x] 5.1 proposal / spec / tasks

## 6. Follow-ups

- [ ] 6.1 Add `stores/search` and `stores/chart` after usage data
- [ ] 6.2 Add the credit-spending reveal endpoints with a credits pool and
      the vendor's `charged` field as the claim
