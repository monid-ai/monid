# Tasks: add-connector-voygr

## 1. Read the VOYGR surface

- [x] 1.1 Pin the public OpenAPI (`https://api.voygr.tech/openapi.json`):
      base url, `X-API-Key`, the 15 routes, `UnifiedEnrichRequest`,
      `PlaceSuggestRequest`, `CallCreateRequest`, `DisclosureBody`,
      `AnswerRequest` and `ValidationJobStatus`
- [x] 1.2 Pin the sub-account contract: `POST /v1/sub-accounts` answers 201
      for a new reference and 200 with the same sub-account for a known one;
      `GET /v1/sub-accounts/{id}` answers 200 or 404; `X-Sub-Account` names
      the sub-account on every other request
- [x] 1.3 Read enrich's credit count live with `estimate_only` for each
      request shape, and its settle from `GET /v1/usage` before and after
- [x] 1.4 Run a small validate job and enrich job live: submit, read,
      download link, cancel

## 2. Provider and resource

- [x] 2.1 `provider.ts`: `X-API-Key` auth, base url, the `default` credit
      pool, the fail-closed relay `start` and the output projection
- [x] 2.2 `schema/sub-account.ts`: the shared `ensure` and
      `SUB_ACCOUNT_BINDING`
- [x] 2.3 `resources/sub-account`: free usage, `verify` on 200 and 404,
      `release` with no request

## 3. Endpoints (15)

- [x] 3.1 `enrich` (flat mirror, the credit count in
      `schema/enrich-cost.ts`, settled from the answer) and `suggest-places`
      (`PER_CALL` 5)
- [x] 3.2 `list-calls`, `get-call`, `answer-call`, `cancel-call`,
      `list-skills`, `skill-manifest` and `me` (an allowlist) on the relay
- [x] 3.3 `call-events` with its own `start`: read the call, open the events
      only once it has an outcome
- [x] 3.4 `place-call` as an async run: terms check, idempotency key, the
      502 and 409 retries, the bounded wait for a late outcome, stop
- [x] 3.5 `validate-batch` and `enrich-batch` as async runs on one lifecycle
      (`schema/job.ts`), plus `get-job` and `cancel-job`

## 4. Fixtures and tests

- [x] 4.1 Record 24 fixtures against `api.voygr.tech` with public
      businesses; write 27 synthetic ones for calls, sub-accounts and
      answers a live request could not produce on demand
- [x] 4.2 Per-endpoint replay and wire tests: happy paths, refusals at
      zero, other workspaces' ids, what goes on the wire
- [x] 4.3 Provider-wide tests over all 15 endpoints: `X-Sub-Account` on
      every request, fail closed in every phase, no `customer_id` or
      `recording_url` in any output, shared fns interned once, every
      `voygr#` reference resolves
- [x] 4.4 Live tests for `enrich` and `suggest-places`: each runs `ensure`
      for the scope `live-test` (creating or finding the sub-account
      `monid:live-test`) and passes the seed to the run as its owned
      sub-account. They need a VOYGR key with sub-accounts enabled and
      are skipped without a VOYGR key

## 5. Verification

- [x] 5.1 `deno task lint` and `check` clean; `deno fmt --check` clean on
      `connectors/voygr` and `connectors/ids.lock.json` (the whole repo
      flags only two upstream workflow files, unchanged here)
- [x] 5.2 `deno task test`: full suite green
- [x] 5.3 `connectors/ids.lock.json` gains the 15 voygr endpoint ids and
      `voygr/sub-account`, and `deno task ids:check` reports none of them
- [x] 5.4 `deno task version:check`: no contract-surface change
