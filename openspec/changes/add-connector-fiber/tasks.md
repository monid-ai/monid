# Tasks: add-connector-fiber

## 1. Decisions

- [x] 1.1 Pool = Fiber credits. Amounts = Fiber's platform-default card;
      the `chargeInfo.creditsCharged` receipt is the claim (D27).
- [x] 1.2 First cut is the simple, synchronous, single-entity surfaces.
      People and company search wait for their own change (proposal
      non-goals).

## 2. Provider

- [x] 2.1 `schema/common.ts`: `zGetDetailedEducation`,
      `zGetDetailedWorkExperience`, `zValue`, `zLooseValue`,
      `zCompanyIdentifier`, `zLocation`
- [x] 2.2 `provider.ts`: meta + 3 notes, `x-api-key` header preset, the
      v1 host, 120 s timeouts, the credits pool, the `chargeInfo`
      consolidate (pluck + claim), `fromError` for `{message}`

## 3. Endpoints (6)

- [x] 3.1 `linkedin-live-fetch/profile/single`: PER_CALL 2
- [x] 3.2 `linkedin-live-fetch/company/single`: PER_CALL 2
- [x] 3.3 `email-to-person/single`: PER_UNIT·RESULT 2, 0 or 1 on
      `output.data`
- [x] 3.4 `contact-details/lite`: COMPOSITE `email` 1 + `phone` 2, with
      `enrichmentType` defaults at the binding
- [x] 3.5 `kitchen-sink/company`: PER_UNIT·RESULT 2, `numCompanies`
      default 1 at the binding
- [x] 3.6 `kitchen-sink/person`: COMPOSITE `lookup` 2 + `live_fetch` 2,
      `numProfiles` / `liveFetch` defaults at the binding

## 4. Verify

- [x] 4.1 `compiler:compile`: 6 docs, no input field without a
      description
- [x] 4.2 `provider.test.ts`: a literal rate table whose key set equals
      the ids. Every happy run settles its row and strips `chargeInfo`.
      Provenance: one inject, one consolidate, one fromError.
- [x] 4.3 Six `endpoint.test.ts` files: misses, provider errors (401,
      402, 404, 410, 429), estimates, input gates, the claim-wins
      mismatch, and live runs gated on `FIBER_API_KEY`
- [x] 4.4 Red once: a receipt of 3 against a card of 4 fails the
      rate-table row with `mismatch`
- [x] 4.5 Six ids added to `connectors/ids.lock.json`

## 7. Follow-ups (not in this change)

- [ ] 7.1 With a Fiber key: `deno task record` the happy and miss chains
      and replace the `synthetic-*` files
- [ ] 7.2 Live fetch of a profile or company LinkedIn no longer serves:
      Fiber answers 404 AND bills 2 credits, but the engine zero-bills
      every non-2xx. Either Fiber stops billing that 404 for the Monid
      account, or the miss cost is accepted.
- [ ] 7.3 People search and company search (per result, plus an
      optional count credit) with a mirrored filter object
- [ ] 7.4 Re-pin amounts if Fiber sets custom per-operation pricing on
      the Monid account (`get-org-credits` returns
      `creditsPerOperation`)
