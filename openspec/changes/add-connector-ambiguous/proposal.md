# Add Ambiguous workspace connector

Agents need to create an Ambiguous workspace or connect an existing one, then
search their content and work on documents and tasks through Monid.

Add ten ordinary REST connector definitions with native request schemas, bearer
authentication, and a free usage model for the selected routine operations. Add a
host-side connection manager that handles agent signup, one-time code exchange,
and accepting an already-issued API/OAuth token. It persists encrypted credentials
per authenticated customer and connection, then supplies the existing transport's
credential resolver. No engine, hook, or compiled-format change is needed.

The host helper deliberately keeps credential issuance outside normal run inputs
and outputs. The hosted Relay implementation is not in this repository; its
connection setup and credential-store wiring are a deployment prerequisite,
documented in `connectors/ambiguous/README.md`. A local file-backed host provides
an executable implementation, not a claim that the hosted service is deployed.

Paid AI generation, destructive operations, full-suite coverage, and an OAuth
callback server are outside this initial connector. Existing workspaces connect
through a setup code or an API/OAuth token; both paths verify identity before save.
