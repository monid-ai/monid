# Tasks: add-connector-fuse

## 1. Vendor surface

- [x] 1.1 Capture Fuse's published Business API OpenAPI (2026-10-29): the
      11 routes, their request schemas and the `{error: {code, message,
      param, values?, doc_url, request_id}}` envelope
- [x] 1.2 Pin the estimate rates from the usage plan of the platform's key
      (`GET /business/data/pricing`): 5 per email found, 10 per phone
      found, 1 per verdict (`unknown` free), 1 per search row returned
- [x] 1.3 Establish the receipt: every lookup, verification, job and free
      answer carries `creditsCharged`; the two searches do not

## 2. Provider

- [x] 2.1 `provider.ts`: inline raw `Basic` inject, base url, timeouts, the
      `default` pool, receipt evidence and consolidate, `output.fromError`;
      no lifecycle
- [x] 2.2 `schema/people-filters.ts` and `schema/company-filters.ts`,
      generated from the OpenAPI document; `schema/person.ts`, the one way
      the lookups and the job name a person

## 3. Endpoints (11)

- [x] 3.1 `prospects/search` and `companies/search`: row-counted
      `PER_UNIT`, page-size estimates, workspace fields dropped
- [x] 3.2 `prospects/filter-options` and `companies/filter-options`: `FREE`,
      `autocomplete` pointers dropped
- [x] 3.3 `data/people/count`: `FREE`, lifecycle repeating with the
      returned filters
- [x] 3.4 `data/companies/count`: `FREE`, lifecycle repeating with the
      returned filters, as the people count does; `data/companies/resolve`:
      `FREE`
- [x] 3.5 `data/people/email`, `data/people/phone`, `data/emails/verify`:
      receipt-settled `PER_UNIT`
- [x] 3.6 `data/people/enrich-jobs`: receipt-settled `PER_UNIT`, lifecycle
      with an idempotent submit and a held read

## 4. Fixtures and tests

- [x] 4.1 28 provider-level chains, `synthetic-` prefixed until recorded
- [x] 4.2 Replay tests per endpoint (happy, provider error, schema gate,
      estimate where billed) and a gated live test per endpoint
- [x] 4.3 Provider test: the id set, the shared hooks, and the wire (raw
      `Basic` key, idempotency key, the job read url)
- [x] 4.4 Record real chains and run `deno task test:live` once the
      platform's key is issued: the 13 normal answers recorded with
      `deno task record` and hand-minimized (people replaced with the
      placeholder personas), and the 11 live tests green against prod

## 5. Verification

- [x] 5.1 `deno task fmt` · `lint` · `check` clean
- [x] 5.2 `deno task test`: full suite green
- [x] 5.3 The 11 ids added to `connectors/ids.lock.json`; `deno task
      ids:check` reports no `fuse#` drift
- [x] 5.4 `deno task catalog endpoints --provider fuse` lists all 11
