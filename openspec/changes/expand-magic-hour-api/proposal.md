## Why
Magic Hour exposes 42 public OpenAPI operations, while Monid main exposes only AI GIF generation. Callers need the current image, video and audio tools, asset uploads, face detection and project management through the same connector.

## Change
Refresh existing PR #108 against the current public API and Monid main. Add all 41 operations beyond the original GIF route, including UGC ads, video upscaling and music generation. Preserve the original GIF catalog identity and use distinct identities for project deletion.

Mirror documented inputs, support source-backed model options and require price selectors at the binding when account-dependent defaults would make admission estimates ambiguous. Generation submits once and polls its accepted ID in the correct media collection. Utility operations return directly without rebilling previous project charges.

This source contribution does not publish or enable Monid's hosted service. Monid retains ownership of human review, credentials and caller/project isolation, destructive-operation authorization, interrupted acceptance and billing reconciliation, catalog publication and channel enablement. No new tests or fixtures are included under the contributor's current task restrictions; existing repository checks will run.
