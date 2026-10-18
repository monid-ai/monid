# Tasks: add-connector-valyu

## 1. Provider and endpoints

- [x] 1.1 Define provider, API-key auth, USD credit pool, receipt consolidation,
      and nanodollar evidence with explicit result-price fallback.
- [x] 1.2 Add Search request mirror, filters, standard limits, and no fabricated
      total-dollar quote.
- [x] 1.3 Add Contents mirror and synchronous-only binding, URL limits,
      summary options, and deduplicated URL estimate.

## 2. Tests and fixtures

- [x] 2.1 Synthetic happy, partial Contents, and shared provider-error fixtures.
- [x] 2.2 Compiled-artifact catalog, auth/wire, fractional/zero/missing receipt,
      provider-error, partial/empty result, and input-gate tests.
- [x] 2.3 Credential-gated live tests; no paid live calls during development.
- [ ] 2.4 Replace synthetic fixtures with scrubbed recordings when a dedicated
      test account is available.

## 3. Documentation and verification

- [x] 3.1 Connector README and OpenSpec proposal/spec.
- [x] 3.2 Add the two Valyu identities; verify fmt, lint, check, replay tests,
      deterministic compile, version gate, and catalog inspection.
- [ ] 3.3 Resolve pre-existing upstream identity-lock drift independently:
      the generated lock refresh includes unrelated additions and renames;
      this change deliberately adds only the two Valyu entries.
