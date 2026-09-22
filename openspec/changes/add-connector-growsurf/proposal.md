# Proposal: add-connector-growsurf

## Why

Every leaf in the catalog today names something an agent RETRIEVES or
GENERATES: a page, a company, a person, a video. None of them lets an agent
operate a thing the user already owns and act on the result. A referral or
affiliate program is the smallest useful example of that, and it is a loop
an agent can close end to end: enroll the customer who just signed up, hand
them their referral link, credit the referral when the action you count
actually happens, record the sale the referred customer made, and read back
who is actually driving growth.

GrowSurf runs those programs for the customer today. Its REST API is one
base url, a bearer key bound to one team, and a plain synchronous request
per operation — there is no wire layer to write and no lifecycle to model.
The key belongs to the caller's own GrowSurf account, so what this connector
exposes is a customer operating their own program, never a data vendor
answering questions about the world.

There is no leaf in the catalog that answers "give this new signup a
referral link" or "this referred customer just paid, so pay their referrer",
and nothing under an existing leaf comes close.

## What Changes

- **connectors/growsurf**: 9 synchronous endpoints against
  `https://api.growsurf.com/v2`, bearer auth, all inheriting the provider's
  FREE usage model.
  - 6 GET: `/campaigns`, `/campaign/{id}`, `/campaign/{id}/participants`,
    `/campaign/{id}/leaderboard`, `/campaign/{id}/analytics`, and
    `/campaign/{id}/participant/{participantIdOrEmail}`.
  - 3 POST: `/campaign/{id}/participant` (enroll),
    `…/{participantIdOrEmail}/ref` (credit a referral) and
    `…/{participantIdOrEmail}/transaction` (record a sale).
- **FREE, and that is a fact rather than a simplification.** GrowSurf does
  not meter its REST API per call: API access is included in the customer's
  plan and plans differ on RATE LIMIT, not on price. That is the tinyfish
  posture — the model alone suffices, both quantities fns are
  compiler-synthesized, and there is no vendor meter to consolidate. A
  future price would be a MODEL change, not a rate-card surprise.
- **The money in these payloads is the CUSTOMER'S, not ours.** A recorded
  sale carries a `grossAmount` and produces a commission the customer owes
  an affiliate. None of it is a charge for the call, and `provider.test.ts`
  pins the sale endpoint as FREE on its own so a later author cannot quietly
  start billing against someone else's revenue.
- **Identities are the vendor's own paths.** No endpoint declares an
  explicit `endpoint`: `request.path` already is the public name, including
  `{id}` and `{participantIdOrEmail}`. The bare `POST /campaign/{id}/
  participant` does not collide with the `{participantIdOrEmail}` read
  because the vendor's own two paths already differ.
- **Faithful mirrors, no wire layer.** Each `schema/inputs.ts` mirrors the
  published OpenAPI request schema with optionality only. No endpoint
  declares `input.toRequest`, `output.fromResponse` or `output.fromError`:
  the validated input IS the wire request, the vendor's body IS the output,
  and GrowSurf's error envelope is already a flat
  `{name, code, message, status, supportUrl}` where `code` is the stable
  machine-readable half.
- **No schema `.default()` anywhere, deliberately.** The obvious candidate
  is analytics' documented `days: 365`. Materializing it would send `days`
  alongside an explicit `startDate`/`endDate` pair and turn a valid request
  into a 400, because the window is EITHER form and not both. The model is
  FREE, so no estimate needs to read a limiting knob, and the default earns
  nothing by being here.
- **Two 200-but-not-done answers are the connector's real hazard**, and both
  get their own chain and their own test. An already-credited
  referral answers HTTP 200 with `success: false`; a resent sale answers
  HTTP 200 with `duplicate: true`, the fields that matched, and the existing
  commission ids. A caller branching on the status code would double-count a
  referral, or believe it had recorded two sales. `meta.notes` says so on
  both docs and the tests pin both shapes.
- **The de-duplication requirement is stated where it is load-bearing.**
  GrowSurf requires at least one transaction identifier on a recorded sale
  precisely so a retry cannot create a second commission. That is a
  cross-field rule and cannot survive `z.toJSONSchema`, so it lives on the
  fields, in `meta.notes`, and in a test that pins every identifier the
  vendor accepts.
- 12 shared provider-level chains (fixture strategy v2), each with a
  `description` and a stated provenance.

## Capabilities

- `growsurf-connector`.

## Non-goals

- **The participant metadata FILTER is not mirrored** on
  `/campaign/{id}/participants`. GrowSurf spells it as the deepObject
  `metadata[key]=value`, and the engine's query mapping is a flat multimap
  with no nesting to encode it into (`toWireQuery`). Expressing it would
  take an `input.toRequest` whose only job is bracket spelling, which is a
  worse trade than leaving it out of v1. Everything else on that endpoint is
  the vendor's own shape.
- **The deprecated `isMonthly` leaderboard boolean is not mirrored.**
  GrowSurf supersedes it with `leaderboardType: CURRENT_MONTH`, which is in.
- **Nothing DESTRUCTIVE or irreversible is ported**, and that is a choice
  rather than an oversight. GrowSurf's API can also delete participants, bulk
  delete them, rotate the API key, fulfill a reward, and approve or delete a
  commission. Those are one-way doors against a customer's live program and
  their affiliates' money, and an agent choosing a tool at call time should
  not be one `discover` away from emptying a customer's participant list.
  They should arrive, if ever, behind something more deliberate than this.
  The three writes that ARE here are all either idempotent (enrollment, on
  email) or explicitly de-duplicated by the vendor (the referral credit,
  the sale).
- **Program CREATION and configuration are not ported** (`POST /campaigns`,
  the PATCH sub-resources for design, emails, options and installation).
  They are a long authoring session, not a tool call, and GrowSurf publishes
  an Arazzo workflow for exactly that.
- **No `deno task record` output.** GrowSurf's write endpoints operate a live
  program, so the committed chains are AUTHORED bodies carrying the `synthetic-`
  prefix, mirroring response shapes verified field for field against a live
  v2.0.0 deployment on 2026-09-22, with GrowSurf's own published example
  identities. The one credential-gated live test is `#campaigns`, the only
  call that needs no program id.

## Impact

New connector tree plus one `connectors/categories.ts` leaf, `referrals` —
the first leaf whose endpoints operate the caller's own account rather than
retrieve or generate something. No new `Unit`, no new preset, no new hook,
no compiler or engine change, and `deno task version:check` is clean.
