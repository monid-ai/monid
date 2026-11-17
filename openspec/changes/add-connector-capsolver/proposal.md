# Proposal: add-connector-capsolver

## Why

CapSolver provides asynchronous CAPTCHA token tasks used in authorized browser
automation, QA, RPA, and public-web data workflows. Adding a native connector
lets Monid users call the same core solving service exposed by CapSolver's MCP
server without requiring Monid to host or proxy another MCP transport.

## What Changes

- Add a `capsolver` provider with JSON-body API-key authentication and the
  documented `createTask` -> `getTaskResult` lifecycle.
- Add proxyless reCAPTCHA v2, reCAPTCHA v3, and Cloudflare Turnstile endpoints.
- Add the `captcha-solving` leaf category.
- Declare the three standard task rates in US dollars per completed task.
- Validate the expected non-empty token and numeric success errorId before
  completion; malformed provider results settle as errors with zero usage.
- Support optional standard reCAPTCHA context fields and document token output
  shapes without dropping vendor extensions.
- Redact clientKey in shared recording copies and cover it with regression tests.
- Add per-endpoint replay and gated live tests, shared lifecycle tests, and
  provider-level recorded and explicitly synthetic fixtures.
- Document local execution, MCP arguments, v2 action provenance, and verified
  demo-page acceptance. Keep input schemas separate from request mapping.

## Capabilities

- `capsolver-connector`.

## Non-goals

- Browser ownership, CAPTCHA detection, DOM token injection, or automatic
  retries inside a caller's browser session.
- Proxy-based and Enterprise task variants in the first change.
- Calling CapSolver's MCP server from Monid; the connector uses the provider's
  public REST API directly.

## Impact

New connector tree and one taxonomy leaf, plus shared fixture-recording
redaction and its tests. No engine ABI, core schema, or CLI path changes. Apply the shared fixes
with the connector; installing only connectors/capsolver does not fix recording.
