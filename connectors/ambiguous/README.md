# Ambiguous

The connector publishes the complete MCP-exposed surface of Ambiguous's pinned
[public OpenAPI](https://app.ambiguous.ai/api/openapi.json), plus native
connection create/connect/list/disconnect endpoints. The generated
[coverage report](./coverage.json) records exact counts and accounts for every
HTTP operation outside that surface, including credential-bearing, internal and
client-specific routes. They are not silently counted as implemented. For
example, image generation is currently assistant-only; audio transcription is
exposed to MCP and is included.

Endpoint IDs retain the API's operationId: `ambiguous#send_email`,
`ambiguous#list_documents`, `ambiguous#create_event`, and so on. Admin and
destructive operations remain available subject to the connected identity's
existing Ambiguous permissions and approval rules. The generator preserves
action annotations and native schemas instead of maintaining a hand-selected
allowlist.

## Connect through ordinary tools

- `ambiguous#connections/create`: send `body.agent_display_name`, `human_email`,
  and optional workspace name/slug. Ambiguous creates a provisional workspace
  and sends its human claim email. Check `human.claim_token_sent`; false means
  delivery failed even though the connection was created. Human claim/merge
  remains on Ambiguous's normal path.
- `ambiguous#connections/connect`: send `body.code`, a one-time setup code from
  Ambiguous Settings → Connect your AI. A stale code fails without creating a
  new workspace. The code is declared sensitive for host history/telemetry
  redaction.
- Both return an opaque `credentialRef` and provision an owned
  `ambiguous/connection`. The actual key is captured and removed at the
  transport boundary, before any engine hook or run result sees it.
- Supply that reference as `pathParams.monid_connection` on API calls. The
  resource gate checks ownership before dispatch; the Relay resolves the
  corresponding customer-bound credential. It never falls back to a shared
  environment key.
- Call `ambiguous#auth_whoami` after connecting to confirm the current principal
  and workspace. Connection metadata is a snapshot; a human claim/merge can
  change the upstream workspace, and the resource's identity view/refresh reads
  it live.
- `connections/list` reads the caller's ownership window.
  `connections/disconnect` releases that connection and forgets its credential;
  it does not delete the workspace or revoke a key used elsewhere.

No raw API-key import or OAuth callback server is added. The existing-account
path uses Ambiguous's already-issued, single-use setup code and preserves that
key's identity, scopes, expiry and revocation.

## HTTP and billing behavior

JSON bodies, nullable fields, pagination and declared headers pass through.
Multipart file fields accept `{filename, contentType?, dataBase64}` and are sent
as real multipart uploads. Binary/non-JSON files return
`{dataBase64, contentType, contentDisposition}` with all bytes intact. JSON
responses remain JSON; empty 204/205 responses remain empty. Finite SSE
responses are returned as the complete event-stream text, preserving the
upstream frames rather than claiming interactive streaming. The two completion
streams and audio transcription use Monid's async lifecycle, with execution on
the first poll.

The Monid connector fee is zero. **Ambiguous's own subscription and AI-action
charges still apply to the connected customer's workspace.** This is a
customer-funded connection, not a pooled reseller account; Monid must not charge
those same upstream actions a second time. Cost notes are included in provider
metadata, and upstream 429/quota and permission errors are retained.

## Standard local host

Use `deno task engine:run`; there is no Ambiguous-specific CLI or account
manager. Set `MONID_CREDENTIAL_STORE_KEY` to a persistent, private 32-byte AES
key encoded as 64 hex characters. Keep it in your secret configuration, separate
from saved ciphertext. The standard CLI stores encrypted credentials under
`.output/credentials` and owned resources in `.output/local.db`, both bound to
`--scope-key`.

Put a setup command's JSON body in a protected local file (never commit it):

```sh
deno task engine:run ambiguous#connections/connect \
  --scope-key my-workspace --body-file /private/path/setup-body.json
```

The file contains `{"code":"<one-time setup code>"}`. For a new workspace, use
`ambiguous#connections/create` with the signup body instead. Then use the
returned reference:

```sh
deno task engine:run ambiguous#auth_whoami \
  --scope-key my-workspace \
  --path-params '{"monid_connection":"<returned UUID>"}'
```

Network/persistence failure during signup or code exchange is not automatically
retried: the upstream mutation may already have committed. Recover through the
normal Ambiguous claim/connection flow instead of silently creating another
account.

## Generation and verification

```sh
deno run --allow-read --allow-write --allow-env scripts/ambiguous-catalog.ts
deno run --allow-read --allow-env scripts/ambiguous-catalog.ts --check
```

Add `--allow-net=app.ambiguous.ai` and `--refresh` to refresh the pinned
OpenAPI. Review the snapshot, coverage report and resulting registration diff
together. Retired operations cause a failure requiring explicit removal review.

Tests exercise compiled artifacts, both setup paths, encrypted persistence,
ownership denial, revocation/disconnect, multipart bytes, exports, headers and
catalog completeness. Upstream responses are synthetic. No test sends a real
claim email or modifies a customer's workspace.

## Hosted handoff

Requires shared engine **0.6.0**. Monid's Relay must supply the generic,
authenticated-customer-bound `CredentialStore` port and implement the declared
capture/reference semantics before enabling this catalog. The host persists the
existing provision/release effects, forgets credentials on credential-resource
release, and uses `redactRunInput` for history/telemetry. The local
implementation and conformance tests are included. No provider-specific hosted
connection manager is needed. Hosted deployment and real-account verification
are still required.

The transport must advertise its `credentials`, `httpBodies`, and `headerInputs`
capabilities only after the corresponding Relay implementation is deployed. The
engine refuses new definitions on an older transport before dispatch, so a
worker upgrade alone cannot bypass credential capture or send an incorrect body
format.
