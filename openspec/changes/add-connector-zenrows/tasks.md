# Tasks: add-connector-zenrows

## 1. Vendor surface

- [x] 1.1 Read the published reference and OpenAPI spec: base url, the two
      auth schemes, the 25 parameters `GET /` takes, the RFC 7807 error
      body, `X-Request-Credits` and `X-Request-Cost`
- [x] 1.2 Confirm the rate card against live requests: plain 1, `js_render`
      5, `premium_proxy` 10, both 25, and `mode=auto` escalating within
      that range (10 observed with `proxy_country`)
- [x] 1.3 Confirm the cross-field rules the API enforces, all 400 REQS004:
      `mode=auto` with `js_render`, `mode=auto` with `premium_proxy`,
      `proxy_country` alone, `proxy_country` beside `js_render` without
      `premium_proxy`
- [x] 1.4 Confirm the Extract envelope `{html, parsed}` and the refusal
      cases: 403 REQS007 carries `reason`, and an unprepared domain gives
      `domain_not_prepared`

## 2. Provider

- [x] 2.1 `provider.ts`: `X-API-Key` header auth, `/v1` baseUrl, timeouts,
      the header relay lifecycle, the credit pool, the identity rate, the
      claim, the input-driven estimate and `output.fromError`
- [x] 2.2 `schema/common.ts`: the Fetch parameter mirror both endpoints
      share, with each API rule in the describe of the field it constrains
- [x] 2.3 Pin the `url` scheme with a pattern rather than `z.url()`'s
      `protocol` option, which compiles away

## 3. Endpoints (2)

- [x] 3.1 `scrape`: markdown default, `html` as the endpoint's own value
      that sends no `response_type`, plus `css_extractor` and `outputs`
- [x] 3.2 `extract`: `extract=auto` merged at the binding,
      `output.fromResponse` returning `parsed`
- [x] 3.3 Add the 2 ids to `connectors/ids.lock.json`

## 4. Fixtures

- [x] 4.1 Record all five from `api.zenrows.com` rather than authoring
      them: scrape markdown, scrape html, 401 AUTH002, extract 200 on a
      prepared domain, extract 403 REQS007
- [x] 4.2 Elide `html` in the extract fixture, keeping `parsed` verbatim,
      so the file stays under the fixture-size lint
- [x] 4.3 `shared/testing/fixtures.ts`: add `x-request-credits` to
      `RECORDED_RES_HEADERS`, so a fixture may carry the meter

## 5. Tests

- [x] 5.1 Billing: the claim settles the bill, a missing meter falls back
      to the ceiling, a malformed meter never becomes a free run, an
      explicit zero is a free run, a readable meter is never a mismatch
- [x] 5.2 The estimate rate table, every row, on both endpoints
- [x] 5.3 Both endpoints intern one relay, claim, evidence and hold
- [x] 5.4 Scrape: the markdown page, the html translation, the digested
      401, and the input gate from both sides
- [x] 5.5 Extract: the fields without the page, a body with no `parsed`,
      the digested 403 with its `reason`, and the input gate
- [x] 5.6 Run the two live tests with a key (`ZENROWS_API_KEY`): 18
      passed, 0 failed, nothing ignored. The connector itself reached
      api.zenrows.com, read the meter where lifecycle.start expects it,
      settled one credit, and Extract returned `product` with no `html`.
      They stay `ignored` without a key, so CI needs none

## 6. Open questions

- [ ] 6.1 Does monid's hosted relay forward response headers? The billing
      design reads `X-Request-Credits` in `lifecycle.start`. It works
      against `directTransport` and the replay harness, and the live run
      above went through `directTransport` too, so it does not answer
      this. `TransportResponse.headers` is optional and there is an
      engine test for a transport that omits them. If the hosted relay
      strips headers, settlement falls back to the 25 estimate silently
      rather than failing, which is the one failure mode this design
      cannot detect from the outside.
