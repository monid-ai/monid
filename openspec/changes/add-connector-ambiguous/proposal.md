# Add the complete Ambiguous agent catalog

Generate one ordinary connector definition for every MCP-exposed operation in a
pinned public OpenAPI snapshot. Account for every other HTTP operation in the
coverage report. Native `ambiguous/connection` resources provide new-workspace
signup, existing-account setup-code exchange, listing and disconnect.

Credential handling, multipart requests, header inputs and byte-preserving exports
use the shared framework extension described in
`../resource-credentials-and-http-bodies/design.md`. There is no separate provider
CLI or connection manager. Credentials stay at the transport/Relay boundary.

The customer owns the upstream identity and its Ambiguous plan/quota. Connector
calls have no Monid charge; upstream AI consumption is not advertised as free.
Hosted activation requires the generic secret-store port, effect persistence,
sensitive-input redaction and an engine 0.6.0 rollout, followed by live validation.
