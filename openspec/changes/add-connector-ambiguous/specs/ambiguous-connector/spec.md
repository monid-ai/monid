# Ambiguous connector

## Requirements

### Customer-scoped authentication

A host-authenticated customer may use only connections saved under that customer.
Connections contain an encrypted upstream credential and the verified principal
and workspace metadata. A copied connection ID or ciphertext never grants another
customer access. Missing connections fail before a network request, without
falling back to an environment credential.

### New workspace

An explicit create action calls agent signup once with the agent name and
accountable human email. Its credential is stored and a secret-free connection
summary is returned, including whether the claim email was sent. The normal
Ambiguous claim/merge process retains ownership of onboarding policy.

### Existing workspace

An explicit connect action redeems a one-time setup code or accepts an API/OAuth
token. The credential must resolve to a workspace through `/api/users/me` before
save. If an expected workspace was selected, a different workspace is rejected.
A failed connection never creates another workspace. Upstream mutations and
one-time exchanges are not automatically retried.

### Workspace operations

The connector provides identity, cross-module search, and list/create/get/update
for documents and tasks. Paths, methods, request fields, pagination cursors, and
nullable update fields follow the public OpenAPI. Authoring content is passed
without conversion. All exposed operations have a free vendor usage model;
upstream errors preserve their HTTP status and settle at zero usage.

### Credential custody and disconnect

Credentials and setup codes stay outside ordinary tool input and output. The host
persists AES-256-GCM ciphertext with scope-bound authenticated data and keeps its
encryption key separately. Request authentication occurs at the existing
transport/Relay boundary and is restricted to the Ambiguous API origin. Disconnect
removes only the connection. Subsequent calls through existing engine instances
must fail, while already-dispatched requests may finish. Upstream revocation is
enforced by Ambiguous on each API call.

### Hosted availability

The hosted provider may be enabled only after its control plane and Relay bind
connection setup and credential lookup to authenticated customer identity. The
public catalog change does not itself prove or deploy that hosted binding.
