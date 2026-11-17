# Tasks: add-connector-capsolver

## Implementation

- [x] Add a provider with transport-level JSON-body authentication.
- [x] Add standard proxyless reCAPTCHA v2, v3, and Turnstile endpoints.
- [x] Preserve optional inputs and describe task-specific token fields.
- [x] Reject malformed success before usage settlement.
- [x] Register the CAPTCHA category and three endpoint identities.
- [x] Redact clientKey from shared recording copies without altering live traffic.
- [x] Keep unrelated Windows CLI path changes outside this submission.
- [x] Separate input schemas from request mapping and document parameter sources.

## Verification and delivery

- [x] Verify real reCAPTCHA v2 through the local compiled connector.
- [x] Verify local stdio MCP discovery, input validation, execution, and polling.
- [x] Submit a fresh token to Google's demo and observe its success response.
- [x] Document the distinction between local execution and hosted availability.
- [x] Add endpoint tests, shared lifecycle tests, and recorded replay fixtures.
- [x] Add regression tests for recording-time and legacy clientKey redaction.
- [x] Gate live tests behind explicit opt-in and provider credentials.
- [x] Deliver English-only source, tests, fixtures, and documentation.
- [x] Use public demo sites or reserved example domains in published challenge inputs.
- [x] Validate the final submission against the stated upstream base.

## Hosted follow-up

- [ ] Publish the connector and configure the hosted provider credential.
- [ ] Verify hosted MCP success, provider errors, timeouts, and billing.
- [ ] Complete live v3 and Turnstile acceptance checks.
- [ ] Back the primary Turnstile success replay with a real successful demo recording.

Local MCP and browser checks are integration evidence. They do not establish
availability through Monid's hosted catalog. The local MCP adapter is not part
of this native connector submission. Final verification details are recorded in
[the connector validation record](../../../connectors/capsolver/VALIDATION.md).
