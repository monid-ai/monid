# Tasks: add-connector-outbound-dev

## 1. Vendor surface

- [x] 1.1 Capture outbound.dev's published OpenAPI
      (`https://api.outbound.dev/openapi.json`, 2026-11-28): the 14 routes
      plus `GET /v1/jobs/{jobId}` and `POST /v1/jobs/{jobId}/cancel`, their
      request schemas and the `{error: {code, message, param?, doc_url,
      request_id}}` envelope
- [x] 1.2 Pin the rates from the published price list (2026-11-26):
      0.001 per search record, 0.02 / 0.05 per email found by the package /
      the waterfall, 0.05 / 0.10 per phone number, 0.01 per verdict
      (`unknown` free)
- [x] 1.3 Establish what each answer says about its charge: the sync
      answers state it only in the `X-Charged-Usd` header; the job carries
      `units` and `chargedUsd` in its body

## 2. Provider

- [x] 2.1 `provider.ts`: `presets.auth.bearer()`, base url, timeouts, the
      `default` dollar pool, `output.fromError`; no lifecycle
- [x] 2.2 `schema/search.ts` (the open filters object and the cursor),
      `schema/company.ts` (the one way a company is named) and
      `schema/person.ts` (the one way a person is named, and `providers`)

## 3. Endpoints (14)

- [x] 3.1 `people/search`, `companies/search`, `companies/people`:
      row-counted `PER_UNIT`, page-size estimates
- [x] 3.2 `people/filters`, `companies/filters`, `people/autocomplete`,
      `companies/autocomplete`, `companies/resolve`: `FREE`
- [x] 3.3 `people/count`, `companies/count`: `FREE`, one shared lifecycle;
      a `filters` count repeats its own request, a `query` count the
      returned filters
- [x] 3.4 `people/enrich/email`, `people/enrich/phone`: one native route,
      two declared endpoints, two-line `COMPOSITE` each, a single-shot
      start carrying the idempotency key
- [x] 3.5 `emails/verify`: verdict-counted `PER_UNIT`, the same start
- [x] 3.6 `people/enrich/batch`: four-line `COMPOSITE`, lifecycle with an
      idempotent two-minute submit, a held read and a cancelling stop,
      `chargedUsd` claimed, nothing counted for a job ended at no charge

## 4. Fixtures and tests

- [x] 4.1 34 provider-level chains, all `synthetic-` prefixed
- [x] 4.2 Replay tests per endpoint (happy, zero-billed answer, provider
      error, estimate where billed, schema gate) and a gated live test per
      endpoint
- [x] 4.3 Provider test: the id set, the shared hooks, and the wire (the
      Bearer key, the phone lookup's `find`, the idempotency keys, the job
      read url, the cancel on stop and its repeat, a start meeting its own
      earlier attempt, both count repeats)
- [ ] 4.4 Record real chains with `deno task record` and run
      `deno task test:live` with the platform's key

## 5. Verification

- [x] 5.1 `deno task fmt` · `lint` · `check` clean
- [x] 5.2 `deno task test`: full suite green
- [x] 5.3 The 14 ids added to `connectors/ids.lock.json`; `deno task
      ids:check` reports no `outbound-dev#` drift
- [x] 5.4 `deno task catalog endpoints --provider outbound-dev` lists all 14
