# Resource credentials and complete HTTP transport

A workspace connection is an owned resource whose upstream credential differs per
instance. Use Monid's existing ownership gate and sealed definitions; do not ship
provider-specific clients or a second connection store beside the host.

## Credential custody

`auth.resource` names a keyed resource binding alias. After ownership admission,
the engine attaches that instance's external ID as `credentialRef` to same-origin
requests. The transport resolves it from a host-scoped `CredentialStore`; there is
no provider-environment fallback. Resource definitions opt into the same behavior
with `credential: true`. Engine hooks and resource snapshots never contain keys.

Credential-issuing endpoints declare `auth.capture.fields`, mapping credential
field names to top-level response field names. The transport requires a store
before dispatch, removes captured fields before returning any response to the
engine, persists successful credentials, and adds an opaque `credentialRef`.
The endpoint's ordinary provision seed makes that reference an owned connection.
The transport handles custody in both local and hosted deployments; it is not an
output transform that happens after credentials have entered run history.

Capture has no automatic retry: signup and one-time exchange may already have
committed. A failed persistence step is explicit. The host must reconcile orphan
credential captures if resource admission fails. Setup-code inputs are marked
sensitive and the shared redaction helper is used before history/log persistence.

The local host supplies an encrypted file-backed credential store bound to its
scope key and a scope-specific existing KV resource store. Hosted Relay supplies
the equivalent caller-bound store using its existing secret-management system.
Disconnect removes the owned resource and forgets its credential, never the
customer's upstream workspace. The host must authenticate the scope independently
of run input; a connection reference is not authority.

## HTTP fidelity

Declared header inputs are validated and reject authentication/framing overrides.
Request encoding is JSON by default; multipart definitions declare file field
names, whose JSON representation contains filename, contentType and dataBase64.
The transport builds multipart bytes, not a JSON string with a multipart header.
Binary response mode returns a JSON envelope of dataBase64, contentType and
contentDisposition. Default text/JSON decoding stays unchanged for older docs.

## Scope and billing

Ambiguous catalog generation covers every operation exposed to MCP in a pinned
public OpenAPI snapshot. Other HTTP operations are listed in the coverage report
with their actual exposure, rather than silently treated as supported. Credentials
are the customer's: Ambiguous subscriptions and AI-action charges remain on that
workspace. Monid's connector fee is zero, explicitly distinguished from upstream
AI consumption in metadata; there is no second charge for the same quota use.

## Compatibility

The new fields are optional and absent on existing definitions. The engine and doc
format floor move to 0.6.0; old sealed artifacts remain executable. Public generic
schema, compiler, transport, resource bindings, local host and tests change together.
Hosted deployment must install the engine and its scoped credential-store port
before admitting the new catalog. No provider-specific hosted manager is required.

The transport must advertise its `credentials`, `httpBodies`, and `headerInputs`
capabilities only after the corresponding Relay implementation is deployed. The
engine refuses new definitions on an older transport before dispatch, so a worker
upgrade alone cannot bypass credential capture or send an incorrect body format.
