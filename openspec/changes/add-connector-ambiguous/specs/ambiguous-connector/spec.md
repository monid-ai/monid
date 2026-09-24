# Ambiguous connector requirements

- Every operation exposed to MCP by the pinned public OpenAPI has exactly one
  native operationId registration, preserving methods, paths, schemas and action
  annotations. The coverage report accounts for every non-exposed operation.
- New-workspace signup and existing-workspace setup-code exchange provision owned
  connections. The Relay captures returned credentials before engine ingress.
  A failed existing-account connection never provisions a new workspace.
- Every ordinary API call requires the connection resource and passes its
  ownership gate. Credential lookup is scoped independently by the authenticated
  host principal and never falls back to a shared provider key.
- Connection listing reveals only the ownership window. Disconnect removes the
  connection and stored credential, not the upstream workspace or a shared key.
- The API remains authoritative for identity, scope, permissions, quotas, approval,
  expiry and revocation. A human claim/merge is reflected by live identity reads.
- Multipart files and binary exports preserve bytes. JSON, null clearing,
  pagination, headers, errors and finite SSE response text preserve their native
  meaning. Long AI calls use the shared async protocol.
- The gateway fee is zero; upstream customer-plan and AI-action charges remain
  on Ambiguous. Metadata must distinguish these billing responsibilities.
- Hosted activation requires the shared engine/Relay features and live validation
  of both onboarding flows. Synthetic tests prove adapter behavior, not deployment.
