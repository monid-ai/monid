# Tasks

## Connector preparation

- [x] Inspect BetterOff authorization and Monid credential interfaces.
- [x] Define 29 fixed endpoints with 21 reads and eight explicitly described writes and transport-resolved credentials.
- [x] Add endpoint-specific v4 result schemas that preserve additional fields.
- [x] Add realistic synthetic fixtures, per-endpoint replay tests, accepted input twins, and provider hook tests.
- [x] Add three credential-gated live tests that assert shape without logging household records.
- [x] Record transport decisions and distinguish provider errors from output-contract failures.
- [x] Run type checking, replay tests, lint, formatting, and the identity check; report upstream identity drift separately.

- [x] Document Core entitlement for all tools separately from OAuth scopes and FREE usage.
- [x] Add concurrent caller isolation, identity override, host denial, token re-resolution, and disconnect tests for the public transport seam.
- [x] Add invalid-token, grant/owner/consent/scope denial, temporary auth failure, and all-tool Core plan-denial coverage with synthetic responses.
- [x] Record hosted acceptance limits locally without contacting Monid.
- [x] Require external-agent idempotency keys; distinguish bank discovery from creation.
- [x] Cover write review state, feedback approval, cancellation denials, and input bounds.

## Release evidence

Local connector replay is not provider-side authorization or Monid hosted verification. Earlier three-tool evidence does not establish the expanded 29-tool deployment.

- [ ] Run the new gated live tests against an authorized BetterOff connection; all tools require Core access.
- [ ] Confirm Monid's supported per-caller credential architecture.
- [ ] Verify hosted two-household isolation across and within workspaces, generic-resource registration, acquisition and concurrent refresh, expiry, revocation, missing scopes, and Core entitlement.
- [ ] Agree on hosted financial-result retention, logging, access, and deletion.
- [ ] Confirm hosted offer pricing before publication.

- [ ] Verify all 29 tools against two authorized synthetic households in the deployed host, including write approval UX, review-link privacy, cancellation policy, feedback consent, and provider idempotency.
