# Tasks: add-connector-call4me

## 1. Vendor surface

- [x] 1.1 Read the published OpenAPI spec (v1.3.0): base url, bearer auth,
      the `POST /calls` body, the call record (`finished`, `cost_cents`),
      `wait_seconds`, hang-up, the `{error}` body
- [x] 1.2 Read the rate card (https://call4.me): $0.25/min US/CA/EU from
      pickup, hold half price, unanswered free, `max_minutes` hold

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `/api` baseUrl, the US-dollar pool,
      `output.fromError`

## 3. Endpoints (3)

- [x] 3.1 `categories` (`call4me#requirements`): FREE
- [x] 3.2 `requirements` (`call4me#requirements/{category}`): FREE, the
      shared profile's `from_profile`/`known` projected away
- [x] 3.3 `calls` (`call4me#calls`): start / poll / stop, PER_UNIT CREDIT
      (one cent) on `cost_cents`, estimate `25 × max_minutes` growing with
      the call, binding omits `connect_when`/`listen_in`/`from` and requires
      `on_behalf_of`/`max_minutes`
- [x] 3.4 Add the 3 ids to `connectors/ids.lock.json`

## 4. Fixtures and tests

- [x] 4.1 Real recordings: categories, requirements/general, a live NIST
      talking-clock call (hand-minimized to 3 exchanges)
- [x] 4.2 Synthetic chains: 422 refusal, stop settles, stop unresolved
- [x] 4.3 `provider.test.ts`: recorded settle, refusal at zero, stop both
      ways, the hold, the binding, the profile projection, one error digest
- [x] 4.4 Live test gated on `CALL4ME_API_KEY` (free requirements read)
