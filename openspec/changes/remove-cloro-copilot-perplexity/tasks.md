# Tasks: remove-cloro-copilot-perplexity

## 1. Vendor surface

- [x] 1.1 Confirm that cloro rejects both endpoints with 400
      `MODEL_UNAVAILABLE` and lists them as unsupported in
      https://cloro.dev/docs/guides/providers

## 2. Connector

- [x] 2.1 Delete `endpoints/copilot/` and `endpoints/perplexity/`
- [x] 2.2 `provider.ts`: summary and notes name the 5 remaining endpoints
- [x] 2.3 `schema/common.ts`: comment

## 3. Tests and lock

- [x] 3.1 `provider.test.ts`: rate-card cases, async list, doc count
- [x] 3.2 `ids.lock.json`: remove the two cloro identities (design D2)
- [x] 3.3 `deno check` and `deno test -A connectors/cloro` pass
