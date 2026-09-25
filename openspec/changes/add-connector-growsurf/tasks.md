# Tasks: add-connector-growsurf

## 1. Drill the vendor surface

- [x] 1.1 Pin the published OpenAPI 3.1 document for GrowSurf REST v2
      (2.0.0): one server, `https://api.growsurf.com/v2`, bearer auth, and
      every request schema field for field
- [x] 1.2 Confirm there is no per-call meter to model: GrowSurf includes
      REST access in the customer's plan, plans differ on RATE LIMIT
      (`RateLimit` / `RateLimit-Policy` on every response, `Retry-After`
      on a 429), and no response carries a consumed-credits receipt.
      FREE, the tinyfish posture
- [x] 1.3 Verify the response shape of all nine operations against a live
      v2.0.0 deployment (2026-09-22), field for field, including the
      affiliate-only participant fields (`isAffiliate`, `affiliateStatus`,
      `payoutSettings.requiredActions`) and the `commissionStructure`
      block that prices a recorded sale
- [x] 1.4 Verify the error envelope live: a flat
      `{name, code, message, status, supportUrl}` on every non-2xx, where
      `code` is the stable half. Recorded shapes seen: 403
      `NOT_AUTHORIZED_ERROR` (no key), 403 `PAID_PLAN_REQUIRED_ERROR`
      (referral program, unpaid team), 402
      `PAYMENT_METHOD_REQUIRED_ERROR` (affiliate program, no payment
      method), 404 `CAMPAIGN_NOT_FOUND`, and 400 `PARTICIPANT_NOT_FOUND`
      — a 400, not a 404, which is on the participant doc's notes
- [x] 1.5 Settle which writes are safe for a tool catalog to carry:
      enrollment is idempotent on email address, the referral credit
      answers an already-credited referral with `success: false`, and a
      recorded sale de-duplicates on the transaction identifiers. Every
      irreversible operation stays out (see the proposal's non-goals)

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `/v2` baseUrl, 30 s/35 s timeouts,
      `usage.model` FREE; no credits, no consolidate, no lifecycle, no
      `output.fromError`
- [x] 2.2 `meta.notes`: the seven caveats that apply to every call — the
      key is bound to one team, program ids are the short dashboard ids,
      plan gating (403 `PAID_PLAN_REQUIRED_ERROR` / 402
      `PAYMENT_METHOD_REQUIRED_ERROR`), owner-email verification, minor
      units and epoch-ms, no per-call charge, and branching on `code`
- [x] 2.3 `schema/common.ts`: the fragments two or more endpoints share —
      `zCampaignPathParams`, `zParticipantPathParams`, `zPagingQueryParams`

## 3. Endpoints (9)

- [x] 3.1 `campaigns`: no input schema at all — the entry point that needs
      no id, and the only endpoint a live test can reach without one
- [x] 3.2 `campaign`: `{id}` mirror
- [x] 3.3 `participants`: `{id}` + cursor paging; the deepObject metadata
      filter deliberately not mirrored
- [x] 3.4 `leaderboard`: `{id}` + paging + the nine-value
      `leaderboardType`; deprecated `isMonthly` not mirrored
- [x] 3.5 `analytics`: `{id}` + the window, `interval`, `include`,
      `timezone`, `platform`; no `.default()` on `days`, and a wider 60 s
      timeout than the provider's
- [x] 3.6 `add-participant`: `{id}` + the `CreateParticipantRequest`
      mirror, `email` the only required field
- [x] 3.7 `participant`: `{id}` + `{participantIdOrEmail}` mirror
- [x] 3.8 `trigger-referral`: `{id}` + `{participantIdOrEmail}` + the
      optional `delayInDays` hold, 1-90
- [x] 3.9 `record-transaction`: `{id}` + `{participantIdOrEmail}` + the
      `RecordTransactionRequest` mirror, `currency` and `grossAmount`
      required, every de-duplication identifier carried

## 4. Fixtures + tests

- [x] 4.1 20 shared provider-level chains (strategy v2), each with a
      `description` naming its provenance; `{{request.url}}` where the
      compiled url is the issued one, literal urls where a path parameter
      is substituted
- [x] 4.2 The two 200-but-not-done chains get their own recordings:
      `synthetic-trigger-referral-repeat` and
      `synthetic-record-transaction-duplicate`
- [x] 4.3 Per-endpoint replay tests, 9 of 9: happy (the WHOLE output
      compared against the fixture body, so an injected billing field or a
      stripped record fails), a provider error, a schema gate with an
      accepted boundary twin, and the doc-shape claim each endpoint makes
- [x] 4.4 Provider-level `provider.test.ts`: the nine compiled urls, FREE
      on every doc with the synthesized quantities entry shared, one
      interned bearer inject with no wire layer anywhere, and the sale
      endpoint pinned FREE on its own
- [x] 4.5 Six credential-gated live tests. `#campaigns` needs only a key;
      the five program-scoped READS discover an id through it at run time
      (`connectors/growsurf/testing.ts`), because a GrowSurf program id
      belongs to one team and cannot be pinned the way vaquill pins a
      public statute id. Plan and verification gates count as ACCOUNT
      states there, since a live key may sit on either side of them
- [x] 4.6 NO live test on the three writes, deliberately: a live run would
      enroll a real person, credit a real referral, or record a real sale
      and generate a commission a real customer then owes. There is no
      read-only form and no vendor sandbox. Stated at each call site

## 5. Wiring + verification

- [x] 5.1 `connectors/categories.ts`: add the `referrals` leaf
- [x] 5.2 `connectors/ids.lock.json`: the nine new ids, added by hand
      rather than with `--update`. The committed lock is ALREADY behind
      the bundle on main — bytedance, fundable, hunterio and litescrape
      ids are compiled but unlocked, because `ci.yml` runs `check` and
      `test` only and never `ids:check`. Regenerating would have swept
      30-odd unrelated ids into this change, so the edit is exactly the
      nine. `ids:check` still reports the pre-existing drift; it reports
      none for `growsurf#`, in either direction
- [x] 5.3 Verify: `deno fmt` clean · `deno lint` clean · `deno task check`
      clean · `deno task test` 1182 passed, 0 failed, 206 ignored ·
      double-compile `--force --frozen-meta` byte-identical ·
      `version:check` reports no contract-surface change · catalog smoke
      lists all nine under `referrals`

## 6. Notes for review

- [x] 6.1 The judgement call worth arguing with is the WRITE SET. Three
      writes are in and every destructive operation is out; the reasoning
      is in `proposal.md` under non-goals. If the project would rather a
      first connector were read-only, dropping the three POSTs leaves six
      coherent reads and no other change
- [x] 6.2 The fixtures are AUTHORED, not `deno task record` output, and
      carry the `synthetic-` prefix for it. GrowSurf's write endpoints
      operate a live program, so a recording would have meant mutating
      one. Every body mirrors a response shape verified live on
      2026-09-22 and uses GrowSurf's own published example identities.
      Real recordings can replace them once a throwaway program exists
      for the purpose

## 7. Review round 1 (CodeRabbit, 2026-09-22)

- [x] 7.1 Completed the synchronous test matrix. Every suite now carries a
      provider-error case, and the eight that lacked one gained it. Eight
      new per-endpoint error chains, one per endpoint and method-correct —
      replay matches METHOD as well as url, so the shared GET chain could
      never have served the three POSTs. Each chain carries a DIFFERENT
      error GrowSurf really returns (404 unknown program, 429 rate limit,
      402 affiliate payment-method gate, 403 referral plan gate, 400
      unknown participant, 422 blocked participant, 422 wrong program
      type) rather than nine copies of one 403
- [x] 7.2 Happy paths now compare the WHOLE output against the fixture
      body instead of picked fields, so an injected billing field fails.
      The usage assertions are unchanged
- [x] 7.3 Live coverage added where it can exist — see 4.5 and 4.6. The
      three writes stay live-test-free on purpose
- [x] 7.4 NOT FIXED, and deliberately: an omitted body on
      `…/{participantIdOrEmail}/ref` is refused although GrowSurf accepts
      a bodyless POST. `engine/request.ts` coerces an absent body to
      `null` before validating it against any declared body schema, so
      this is engine-wide — 23 endpoints across the repo declare an
      all-optional body and every one behaves the same way. A connector
      cannot fix it: `.nullable()` would pass validation and then put a
      literal `null` on the wire, which is worse. The behaviour is now
      pinned by a test and called out in `meta.notes` so a caller is told
      to send `{}`. The real fix belongs in the engine and should be its
      own change
