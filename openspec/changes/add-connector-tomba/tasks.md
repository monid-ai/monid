# Tasks: add-connector-tomba

## 1. Decisions (owner, 2026-11-11)

- [x] 1.1 Scope = the 20 data tools of the remote MCP server (D1)
- [x] 1.2 Four pools: search, verification, email_count, sources (D2)
- [x] 1.3 Synthetic fixtures from the OpenAPI examples; live recording
      is a follow-up

## 2. Provider

- [x] 2.1 `schema/auth.ts`: `zTombaCredentials {apiKey, secretKey}` +
      `TOMBA_KEYS`
- [x] 2.2 `schema/common.ts`: `zDomain` (vendor regex), `zCompanyName`,
      `zEmail`, `zLinkedinUrl`, `zCountryCode`, `zEnrichMobile`;
      `schema/finder.ts`: the finder-family rate card and the
      single-address finders' shared estimate / evidence
- [x] 2.3 `provider.ts`: meta and notes, an inline two-header inject
      (D3), the v1 host, timeouts of 180 s / 200 s (D7), four pools, a
      generic evidence that counts nothing, and `fromError` for
      `{errors: {}}` (D4)

## 3. Endpoints (20)

- [x] 3.1 domain-search and similar: `limit` required, `every: 10` on
      the requested limit (D6)
- [x] 3.2 email-finder, enrich, linkedin: the finder composite; the
      4-arm email-finder union; linkedin `full=true` arrays
- [x] 3.3 author-finder, people/find, companies/find, combined/find:
      PER_UNIT on a hit; the 200 `errors` no-match is free (D4)
- [x] 3.4 email-verifier: verification + search-pool phone line
- [x] 3.5 phone-finder (3-arm union, input-selected price) and
      phone-validator (PER_CALL)
- [x] 3.6 reveal/search: POST body mirror of RevealSearchRequest /
      RevealFilters, query | filters union, PER_UNIT·PAGE
- [x] 3.7 email-count, email-format, location (PER_CALL email_count),
      email-sources (sources; 201 miss), technology, domain-suggestions,
      domain-status (FREE)
- [x] 3.8 `webhook_url` omitted everywhere (D5)

## 4. Verify

- [x] 4.1 `compiler:compile` twice, byte-identical; 20 tomba docs
- [x] 4.2 `provider.test.ts`: a literal rate table whose key set equals
      the ids; every happy run settles its row and relays the body;
      every 401 is zero-billed and digested; provenance (one inject, one
      fromError, no consolidate / lifecycle / fromResponse, the pool
      set, metered docs own their evidence)
- [x] 4.3 Twenty `endpoint.test.ts`: variant and miss chains with exact
      usage, estimates for the input-dependent docs, the schema gate
      with near twins, and live tests gated on `TOMBA_KEYS`
- [x] 4.4 Red once: setting combined/find to 3 fails the rate table;
      the null `phone_data` / `data` examples caught an `optionalLen`
      throw before merge (D6)
- [x] 4.5 fmt · lint · check · test · ids (tomba rows only) ·
      version:check

## 6. Follow-ups (not in this change)

- [ ] 6.1 With a Tomba key, `deno task record` the happy and miss
      chains and replace the `synthetic-*` files
- [ ] 6.2 Confirm which balance the email verifier's phone numbers draw
      (assumed `search`, D6) and whether the finder phone add-on is per
      result (as published: "6 with phone data") or per number (as for
      the verifier)
- [ ] 6.3 Scope bulk jobs (`/bulk/*`) if catalog demand appears
