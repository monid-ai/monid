# Shared resource credential and HTTP contract

## Credential-backed resources

`ResourceDef.credential: true` marks an owned resource whose externalId is an opaque
reference in the authenticated host's secret store. `auth.resource` names a keyed
binding alias, validated at compile time against a credential-backed resource.
The engine must gather and verify ownership before attaching a credential reference
to any outgoing same-origin request, including each async poll and resource view.
A missing/foreign resource causes no upstream request. Secret lookup remains
independently scoped by host identity, provider, origin and reference, with no
provider-environment fallback.

## Credential capture

`auth.capture.fields` maps stored credential field names to top-level response
field names. Capture endpoints must provision a credential-backed resource and
must not simultaneously select an existing resource credential. A scoped store is
required before dispatch. On success, capture removes credentials and any duplicate
secret occurrences before returning a JSON body with `credentialRef`. Response
headers are withheld at this boundary. Error responses contain status and a generic
exchange failure, never credentials. Malformed capture and persistence/network
failure are non-retriable `CREDENTIAL_CAPTURE_FAILED`: upstream effects may have
committed. The host reconciles a captured secret whose subsequent resource admission
fails; neither side silently retries signup or one-time exchanges.

An explicitly empty credential schema means no provider credential fields. Legacy
hand-built schemas without a properties declaration keep the apiKey fallback.

## Host ports and release

`CredentialStore.capture/resolve/forget` is implemented in the transport/Relay.
The host authenticates its scope and supplies the store; the scope is not a tool
argument. The local implementation encrypts per-instance parameters using
AES-256-GCM, with scope/provider/origin/reference bound as authenticated data.

Normal resource effects remain the authoritative ownership transition. On release,
the host removes ownership before forgetting the credential. The resource lifecycle
release method also forgets its bound credential through the transport port. An
already-dispatched request may finish; later requests fail. The upstream account
and credential are not revoked by a mere connection release.

`input.sensitive` declares paths that `redactRunInput` masks before user-visible
history and telemetry persistence. Execution still receives the original input;
its transport is responsible for capture. Hosted workflow storage must protect
sensitive execution payloads rather than replacing them with the redacted copy.

## HTTP fidelity

Header inputs require a declared schema. Authentication, cookie, host, content-type,
content-length, connection and transfer-encoding overrides are rejected, as are
case-insensitive duplicates. Headers are carried through declarative and lifecycle
requests and cannot replace the credential boundary's authorization.

Multipart requests declare `bodyEncoding` and `fileFields`. File input is
`{filename, contentType?, dataBase64}`. The shared transport constructs FormData and
lets the HTTP implementation set the boundary. Other fields retain their values.
Invalid or oversized encoded files fail before network dispatch.

`responseEncoding: auto` preserves JSON and finite SSE text and encodes other
successful payloads as `{dataBase64, contentType, contentDisposition}`. Explicit
`base64` also exists. Default decoding for older artifacts is unchanged. Empty
204/205 bodies remain empty. Error status/body behavior stays the existing contract.

## Compatibility and deployment

Engine and doc-format floor are 0.6.0. Existing sealed artifacts remain executable;
new fields are optional and absent on old definitions. Hosted admission must not
advertise 0.6.0 until the Relay implements capture, scoped lookup, HTTP encodings,
sensitive-input handling and credential cleanup. Definitions alone do not deploy
that private host implementation.

The transport must advertise its `credentials`, `httpBodies`, and `headerInputs`
capabilities only after the corresponding Relay implementation is deployed. The
engine refuses new definitions on an older transport before dispatch, so a worker
upgrade alone cannot bypass credential capture or send an incorrect body format.
