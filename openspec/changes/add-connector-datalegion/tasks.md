# Tasks

- [x] Read PDL and ContactOut conventions and official enrichment references.
- [x] Add six endpoint variants with isolated credentials, shared native schemas,
  and the supplied contract's USD rates per successful matched call.
- [x] Add synthetic fixtures and offline tests for inputs, authentication,
  estimates, once-per-matched-call billing, empty results, and provider errors.
- [x] Add only the six Data Legion identities to the lock. Repository-wide
  ids:check reports 85 pre-existing differences in other providers; Data Legion
  has no identity drift. Leave unrelated identities unchanged.
- [x] Decode file URLs in scripts/lib.ts so CLI commands support non-ASCII
  workspace paths.
- [x] Require --live-datalegion to opt into live endpoint tests.
- [x] Replace teaching notes with concise English implementation comments and
  operational documentation; remove machine-specific paths from the connector.
- [x] Pass whole-repository typecheck and offline tests: 1283 passed, 0 failed,
  227 ignored. Pass Data Legion lint, format, and whitespace checks.
- [x] Pass all six isolated request audits using distinct dummy keys and no
  network permission, covering exact requests, credential resolution, missing-key
  rejection, and HTML 403 preservation.
- [ ] Complete live acceptance with the credential owner and provider: resolve
  observed 403 responses, confirm field entitlements, and reconcile billed rates.
