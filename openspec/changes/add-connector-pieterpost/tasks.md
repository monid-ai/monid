# Tasks: add-connector-pieterpost

## 1. Verify the provider surface

- [x] Confirm the public API docs and live base URL.
- [x] Confirm bearer-key auth and required `Idempotency-Key` behavior.
- [x] Confirm compose-link calls do not send mail or charge a user.
- [x] Confirm checkout-link calls do not send mail before hosted payment.

## 2. Connector

- [x] Add provider metadata, bearer auth, free usage, and `postal-mail`.
- [x] Add create-compose-link with recipient schema and header mapping.
- [x] Add create-checkout-link with text letter/postcard schemas and header
      mapping.

## 3. Fixtures and tests

- [x] Add synthetic happy and provider-error fixtures for both endpoints.
- [x] Cover free settlement, provider errors, schema gates, request mapping,
      and shared compiled hooks.
- [ ] Replace synthetic fixtures with scrubbed recordings when a dedicated
      PieterPost test API key is available to Monid.

## 4. Verification

- [x] Run format, lint, typecheck, replay tests, identity lock update,
      deterministic compile, version check, and catalog inspection.
