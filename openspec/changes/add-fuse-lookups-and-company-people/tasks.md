# Tasks: add-fuse-lookups-and-company-people

## 1. Vendor surface

- [x] 1.1 Take the four routes' request and answer shapes from Fuse's
      Business API contract (2026-11-02): the reverse email and phone
      lookups, the contact check and a company's people, with its paging
- [x] 1.2 Pin the estimate rates from the plan entries Fuse sets for the
      routes: 1 per person found by email, 2 per person found by phone, 1
      per person returned by a company's people list; the contact check
      free

## 2. Endpoints (4)

- [x] 2.1 `data/people/reverse-email` and `data/people/reverse-phone`:
      receipt-settled `PER_UNIT`
- [x] 2.2 `data/people/contact-status`: `FREE`, a `linkedinUrl` or a `name`
      with a `companyDomain`
- [x] 2.3 `data/companies/people`: receipt-settled `PER_UNIT`, page-size
      estimate, `scrollToken` passed through, the four company filter
      fields omitted

## 3. Fixtures and tests

- [x] 3.1 8 provider-level chains, `synthetic-` prefixed
- [x] 3.2 Replay tests per endpoint (happy, miss or refusal, schema gate,
      estimate where billed) and a gated live test per endpoint, on
      placeholders that name nobody
- [x] 3.3 Provider test: the id set grows to fifteen
- [ ] 3.4 Once the routes answer on production for the platform's key:
      record the normal answers with `deno task record`, retire the matching
      `synthetic-` chains, and run `deno task test:live`

## 4. Verification

- [x] 4.1 `deno fmt`, `deno lint` and `deno check` clean on the changed
      files
- [x] 4.2 `deno task test`: full suite green
- [x] 4.3 The 4 ids added to `connectors/ids.lock.json`; `deno task
      ids:check` reports no `fuse#` drift
- [x] 4.4 `deno task catalog endpoints --provider fuse` lists all 15
