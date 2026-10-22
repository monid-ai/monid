# Tasks: add-connector-openai

## Connector implementation

- [x] Inspect the six hosted Monid contracts and official native Images APIs.
- [x] Add bearer-authenticated provider, long-request timeouts and USD pool.
- [x] Add shared native field mirrors and public binding constraints.
- [x] Add six fixed-model generation/edit endpoints and JSON reference mapping.
- [x] Add per-token rate card, input-derived estimates and receipt evidence.
- [x] Add size preflight and zero-billed vendor/malformed-response failures.
- [x] Document native PNG base64 and the host artifact-storage integration seam.
- [x] Register only the six new public identities in ids.lock.json.
- [x] Add minimal shared synthetic fixtures and sealed-unit integration tests.
- [x] Add credential-gated live smoke tests for all six endpoints.

## Verification

- [x] Format/lint/typecheck the change and run its offline integration suite (39 passed, 6 credential-gated skips).
- [x] Run the full repository offline test suite (1298 passed, 0 failed, 221 skipped).
- [x] Verify deterministic compilation, six catalog identities, pure estimate CLI and version gate.
- [x] Review calculator evaluation order, malformed PNG/Base64 responses and empty-host URLs;
      add regression cases and rerun the full offline suite on 2026-10-17.
- [x] Re-run all checks after maintainer feedback on 2026-10-19: OpenAI 39 passed
      with 6 live skips; full offline suite 1298 passed, 0 failed, 221 skipped;
      full typecheck, scoped lint/format and version gate passed.
      Two forced frozen-metadata compiles have identical SHA-256 hashes.
- [x] Compare all six compiled output estimators with the current official calculator
      across 757796 valid size/quality combinations (zero differences).
- [ ] Follow up existing ids.lock.json drift separately: 78 unregistered and
      7 obsolete non-OpenAI identities in main; this port preserves existing entries.

## Follow-up requiring private infrastructure or vendor credentials

- [ ] Compare native mapping/estimates with the legacy monid-services adaptor.
- [ ] Connect/verify hosted PNG persistence, image artifacts and seven-day URLs.
- [ ] Run live vendor smoke tests and replace synthetic fixtures with sanitized recordings.

## CodeRabbit review follow-up

- [x] Split endpoint cases into six endpoint.test.ts files, retaining provider
      provenance and shared lifecycle regressions at provider level.
- [x] Deep-equal the complete success usage object and add valid schema-gate twins.
- [x] Cite the Standard pricing URL and check date in provider.ts and the
      independent compiled-rate test table; leave all pinned rates unchanged.
- [x] Verify guard-removal suggestions against the current hook ABI. Direct
      removal fails typechecking because toRequest still receives Json | undefined;
      preserve its fallback and array narrowing with a reason comment.

## Maintainer review follow-up (2026-10-19)

- [x] Reproduce the admission estimate's invalid_size FN_CONTRACT before fixing it.
- [x] Share one typed estimate factory through the existing preset carrier;
      preserve all model grids and reference/mask allowances.
- [x] Move the common rate-card declaration to provider usage and implement
      receipt evidence once in provider.ts. Explicitly bind that shared function
      at each endpoint because the compiler requires doc-level hooks for three
      metered components. No engine/compiler/schema change is needed.
- [x] Leave cross-field size rejection only in lifecycle.start; estimates return
      finite counts, then all six endpoints return a clear zero-billed 400
      without any transport call. Keep schema rejection for malformed syntax.
- [x] Compare the new compiled estimates against both the previous compiled
      estimates and the official calculator snapshot: 757796 valid combinations,
      zero differences. Pinned rates, input mappings and receipt hooks are unchanged.
