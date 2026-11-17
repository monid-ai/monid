# Tasks: add-connector-boxcompute

## 1. Vendor surface

- [x] 1.1 Read the published OpenAPI spec: bearer auth; the bodies and
      answers of the sandbox, execute, file list, preview, start, stop,
      delete and cost operations; the `{code, error}` error body; and the
      Idempotency-Key rule (printable ASCII, 1-255 characters).
- [x] 1.2 Read the rates from the pricing page and the cost API's
      `rateMicrosPerMinute`: Small 834 micros a minute, Large 2502.

## 2. Provider and resource

- [x] 2.1 `provider.ts`: bearer auth, origin base URL, and an output strip
      of the pooled account's internals (no credit pool: every call is free).
- [x] 2.2 `resources/vm/resource.ts`: data, a DAY period with the
      ESTIMATED `compute` line, the windowed cost reconciler (live and
      deleted VMs), verify, release and refresh.
- [x] 2.3 `schema/common.ts`: sandbox id, size and /workspace path.
- [x] 2.4 `code-execution` leaf in `connectors/categories.ts`.

## 3. Endpoints (9)

- [x] 3.1 `create-sandbox`: create with an idempotent retry, wait for the
      boot, and handle the refusal.
- [x] 3.2 `get-sandbox` and `list-sandboxes`: reads; the list comes from
      the ownership window.
- [x] 3.3 `run-command`, `list-files`, `open-preview`, `start-sandbox` and
      `stop-sandbox`: uses.
- [x] 3.4 `delete-sandbox`: an immediate delete plus the release mark.
- [x] 3.5 Add the 9 ids and the resource id to `connectors/ids.lock.json`.

## 4. Fixtures and tests

- [x] 4.1 Record the real chains against production (2026-10-26), scrub
      account identifiers, and minimize them.
- [x] 4.2 Build the synthetic chains for running, slow-boot, busy-delete
      and cost-window cases.
- [x] 4.3 `endpoints/<e>/endpoint.test.ts` for every endpoint: the happy
      path, a provider error, the ownership 404s, a schema gate with its
      passing twin, and the provision and release marks.
- [x] 4.4 `resources/vm/resource.test.ts`: verify, release, refresh, and
      reconcile (live, windowed, deleted, refused reads).
- [ ] 4.5 Enable the two 204 tests once #199 lands.
