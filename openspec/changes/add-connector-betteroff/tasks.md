# Tasks

## Connector preparation

- [x] Inspect BetterOff authorization and Monid credential interfaces.
- [x] Define three fixed read-only endpoints and transport-resolved credentials.
- [x] Add endpoint-specific v4 result schemas that preserve additional fields.
- [x] Add realistic synthetic fixtures, per-endpoint replay tests, accepted input twins, and provider hook tests.
- [x] Add three credential-gated live tests that assert shape without logging household records.
- [x] Record transport decisions and distinguish provider errors from output-contract failures.
- [x] Run type checking, replay tests, lint, formatting, and the identity check; report upstream identity drift separately.

- [x] Document recurring-data Core entitlement separately from OAuth scopes and FREE usage.
- [x] Add concurrent caller isolation, identity override, host denial, token re-resolution, and disconnect tests for the public transport seam.
- [x] Add invalid-token, grant/owner/consent/scope denial, temporary auth failure, and recurring plan-denial coverage with synthetic responses.
- [x] Draft exact hosted integration questions locally, without contacting Monid.

## Release evidence

- [ ] Run the new gated live tests against an authorized BetterOff connection; recurring data requires a Core household.
- [ ] Confirm Monid's supported per-caller credential architecture.
- [ ] Verify hosted two-household isolation across and within workspaces, generic-resource registration, acquisition and concurrent refresh, expiry, revocation, missing scopes, and Core entitlement.
- [ ] Agree on hosted financial-result retention, logging, access, and deletion.
- [ ] Confirm hosted offer pricing before publication.
