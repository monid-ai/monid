# Ambiguous

Ten routine workspace operations, with customer-scoped connection setup for both
new and existing Ambiguous workspaces. Definitions use the public
[OpenAPI contract](https://app.ambiguous.ai/api/openapi.json); document content
and task fields pass through without conversion. The vendor cost is zero for
these operations. AI generation, billing, deletion, and account administration
are not in this initial catalog.

| Endpoint                    | Operation                                 |
| --------------------------- | ----------------------------------------- |
| `ambiguous#whoami`          | Connected principal and workspace         |
| `ambiguous#search`          | Search accessible workspace content       |
| `ambiguous#list-documents`  | Paginated document list                   |
| `ambiguous#create-document` | Create a document, sheet, or presentation |
| `ambiguous#get-document`    | Read document content                     |
| `ambiguous#update-document` | Update metadata or content                |
| `ambiguous#list-tasks`      | Filter and paginate tasks                 |
| `ambiguous#create-task`     | Create and assign a task                  |
| `ambiguous#get-task`        | Read a task                               |
| `ambiguous#update-task`     | Update or complete a task                 |

## Connection setup

`AmbiguousConnections` is a host-side control-plane helper, not a tool hook.
Signup and setup-code exchange issue credentials, so they must execute outside
ordinary tool inputs, outputs, run history, and fixture recording. The ten
catalog endpoints remain ordinary `defineEndpoint` definitions; the engine is
unchanged.

- `create(scopeKey, signup)` calls Ambiguous's agent signup once and saves the
  returned credential. It returns a connection summary and `claimEmailSent`. The
  new workspace is provisional until the accountable human claims or merges it
  using Ambiguous's email. Show an explicit delivery warning when
  `claimEmailSent` is false; the connection is still usable.
- `connectSetupCode(scopeKey, code, expectedWorkspaceId?)` exchanges a one-time
  code from Ambiguous Settings → Connect your AI, verifies the resulting
  identity, and saves it. An expired or consumed code fails without creating a
  workspace.
- `connectToken(scopeKey, token, expectedWorkspaceId?)` validates and saves a
  user-supplied API key or the token from the host's completed Ambiguous OAuth
  flow. This helper does not implement an OAuth browser callback server.
- `get` returns only identity metadata. `disconnect` removes the saved
  connection; it does not delete the workspace or revoke a key another client
  might use.
- `transport(scopeKey, connectionId)` injects that connection's credential only
  for Ambiguous API requests. It reloads the connection on each call, so a
  retained engine instance cannot use a disconnected connection. Upstream expiry
  and revocation return normal API errors; no fallback credential is selected.

`scopeKey` is the authenticated Monid customer/workspace, supplied by the host.
It must never come from tool arguments. A connection ID is only a selector;
knowing another customer's ID does not confer access. Credential ciphertext uses
AES-256-GCM with the customer and connection bound as authenticated data. Store
the persistent 256-bit encryption key in the host's secret manager, separate
from the ciphertext. Preserve that key across restarts; changing it requires a
migration.

The host supplies a durable `ConnectionStore`. `FileConnectionStore` is a
runnable local implementation with atomic, exclusive inserts and owner-only file
modes. Tests use the same manager with an isolated in-memory store and
separately test file persistence. In a distributed deployment, use the host's
existing durable database/object storage and secret-management infrastructure,
not process memory.

No automatic retries are made for signup or one-time exchange. If a network or
storage failure occurs after the upstream mutation, signup may already have
created a workspace or the setup code may already be consumed. Recover through
Ambiguous's claim/connection UI; do not silently repeat account creation.

## Hosted Monid wiring

This repository does not contain the hosted `monid-services` application.
Merging these definitions alone does not install the connection flow there.
Before enabling the provider in the hosted catalog, the host must:

1. Call the manager's create/connect methods from authenticated connection
   setup, with sensitive request/response logging disabled. Retain only the
   returned connection summary in UI state.
2. Bind the run's credential lookup to its authenticated customer and selected
   connection. `transport` is the runnable direct-host implementation. A hosted
   Relay must perform the equivalent lookup and decryption in its existing
   credential-injection boundary; do not send keys through the engine worker.
3. Wire disconnect to the same customer-scoped store. Return upstream 401/403
   responses as reconnect/permission errors, never as permission to provision.
4. Verify create → run and connect → run in staging, including cross-customer
   denial. Tests here use synthetic upstream responses, not a hosted rollout.

The conventional `AMBIGUOUS_CREDENTIALS_API_KEY` environment variable remains
usable with `deno task engine:run` for a single trusted local identity. It is
not a shared credential configuration for the multi-customer hosted provider.

## Runnable local host

Set `AMBIGUOUS_CONNECTION_SCOPE` to your local customer identifier and
`AMBIGUOUS_CONNECTION_KEY` to a persistent 32-byte encryption key encoded as 64
hex characters. Keep both in your local secret configuration. The optional
`AMBIGUOUS_CONNECTION_DIR` defaults to `.output/ambiguous-connections`.

Send one JSON command on standard input; keys and codes do not belong in command
arguments or shell history:

```sh
deno run --allow-read --allow-write --allow-env \
  --allow-net=app.ambiguous.ai --allow-run=git \
  connectors/ambiguous/cli.ts < command.json
```

New workspace (use the accountable human's real email):

```json
{
    "action": "create",
    "signup": {
        "agent_display_name": "Research Agent",
        "human_email": "owner@example.com",
        "workspace_name": "Research"
    }
}
```

Existing workspace: the command fields are `action: "connect"`, `setupCode`, and
optional `workspaceId`. Alternatively use `action: "connect-token"`, `token`,
and optional `workspaceId`. Read sensitive values from a protected input file or
pipe; do not commit that file. The response contains the connection ID and
identity, never the credential.

Use the returned connection ID for subsequent commands:

```json
{
    "action": "run",
    "connectionId": "<returned UUID>",
    "endpoint": "ambiguous#search",
    "input": { "body": { "query": "release plan", "limit": 5 } }
}
```

`{"action":"get","connectionId":"<returned UUID>"}` inspects a connection;
`{"action":"disconnect","connectionId":"<returned UUID>"}` forgets it locally.

## Verification

```sh
deno test --allow-read --allow-env --allow-write connectors/ambiguous
deno task check
deno task test
deno task ids:check
```

The read-only live `whoami` test additionally requires network permission and
`AMBIGUOUS_CREDENTIALS_API_KEY`. It is skipped when no credential is configured.
No test automatically creates a live workspace or sends a real claim email.
