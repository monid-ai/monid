# Proposal: add-connector-voygr

## Why

VOYGR runs two APIs. The Places API checks whether a place
exists and is open, enriches it with attributes such as opening hours, phone
and website plus custom research fields, and suggests places to call.
PlaceCall makes real outbound phone calls with an AI voice agent and returns
a structured outcome and a transcript. Through Monid, an agent can use both
without a VOYGR account of its own.

Monid calls a provider with one key for all its users. On VOYGR that one key
would make every Monid workspace a single customer: one call list, one set of
call limits and one usage report, so one workspace could read another's
calls. VOYGR keeps them apart with sub-accounts: a VOYGR key with
sub-accounts enabled can create them under itself, and a request that names
one in the `X-Sub-Account` header runs under that sub-account's own limits
and sees only the calls, suggestions and jobs made under it. This
connector gives each Monid workspace its own sub-account and sends no request
without it.

The connector needs no engine change. The sub-account is a free resource,
bound by every endpoint with a keyless `uses` and an `ensure`, the hook whose
own contract (`shared/core/schema/hooks/resource-binding.ts`) gives "one
mailbox per workspace" as its example.

## What Changes

- **connectors/voygr**: 15 endpoints against `https://api.voygr.tech`,
  `X-API-Key` auth, one credit pool (`default`, VOYGR credits at $0.01 each at
  list price) and one free resource, `voygr/sub-account`.
  - Places (category `maps`): `enrich` and `suggest-places` (sync),
    `validate-batch` and `enrich-batch` (one async run per job), `get-job` and
    `cancel-job`.
  - PlaceCall (category `agentic-phone`): `place-call` (one async run per
    call), `list-calls`, `get-call`, `call-events`, `answer-call`,
    `cancel-call`, `list-skills`, `skill-manifest` and `me`.
- **One sub-account per workspace.** The shared `ensure` posts the reference
  `monid:<scope key>` to `POST /v1/sub-accounts` when the workspace owns no
  row. VOYGR answers 201 for a new reference and 200 with the same sub-account
  for a known one, so two first requests from one workspace end at one
  sub-account. Any other answer throws, and the run does not start. The
  resource's `verify` reads `GET /v1/sub-accounts/{id}`: 200 is active
  whatever the sub-account's status, 404 is inactive. `release` calls nothing;
  VOYGR keeps the sub-account and its usage history.
- **Fail closed.** A provider-level `lifecycle.start` relays the 11 endpoints
  that have no lifecycle of their own. It reads the workspace's row and adds
  `X-Sub-Account`, or answers 503 `SUB_ACCOUNT_UNAVAILABLE` without a request.
  The four endpoints with a lifecycle of their own (`place-call`,
  `validate-batch`, `enrich-batch`, `call-events`) repeat that check in every
  phase they have, and every request they make carries the header.
- **What a workspace sees.** The provider's `output.fromResponse` and
  `output.fromError` remove `customer_id` (Monid's own VOYGR account, which
  every workspace shares) and `recording_url` (a path this connector has no
  route for) at any depth. `voygr#me` keeps four fields instead: the
  workspace's call limits, the charge per call and the maintenance window.
- **Billing in VOYGR credits.** `enrich` counts from the request: 1 for any
  standard attribute, 1 per research field, 2 for `owners` or `key_people`
  plus 1 per contact, 1 for `verify_name` or `verify_address` and 1 for
  `verify_registered_address`. The settle drops the standard credit when VOYGR
  refunds it: a request that also researches or checks, where no standard
  value comes back. `suggest-places` costs 5 per answered request.
  `place-call` costs 10 when `outcome_charge_cents` is above 0.
  `validate-batch` costs 1 per succeeded row, and `enrich-batch` costs the
  one-place price per succeeded row. Reads, answers and cancels are free, and
  the engine settles every non-2xx at 0.
- **Calls.** `place-call` takes an `accept_terms` field that must hold the
  exact PlaceCall API terms text; the connector checks it and does not send
  it. The call carries `X-Client-Agent: monid:t20261023`, which names the
  terms version accepted, and `Idempotency-Key: <runId>:call`. The run polls
  every 5 seconds and completes once the call has a terminal status and an
  outcome (`outcome_type` or `result`). A read that fails or answers 429
  never ends the run. Stop cancels the call and settles from the final
  record, or returns UNRESOLVED when the cancel fails or the call cannot be
  read.
- **Mid-call questions.** A running call's questions show in
  `pending_questions` on `voygr#get-call`, and `voygr#answer-call` answers
  them. `voygr#call-events` reads finished calls only: VOYGR keeps a running
  call's event stream open, and Monid's transport waits for the whole body
  (`engine/transport.ts`), so a running call answers 409 `CALL_STILL_RUNNING`
  at once.
- **Batch.** A batch run lasts as long as its job, read every 30 seconds (or
  at the job's ETA, up to 5 minutes away) for up to 24 hours, and completes
  with the job's status and its download link. `enrich-batch` takes one set of
  attributes and checks for all its places, because the job reports how many
  rows succeeded and not which, and the bill needs every row at the same
  price.
- **Fixtures.** 24 recorded against `api.voygr.tech` (enrich, suggest, batch
  jobs, skills) using public businesses, and 27 synthetic ones (`synthetic-`
  prefix) for calls, sub-accounts and answers a live request could not produce
  on demand. No test dials a phone.

## Capabilities

- `voygr-connector`.

## Non-goals

- Single-place `POST /v1/validate`. `voygr#enrich` returns `existence` and
  `open_closed` for one place, and `voygr#validate-batch` takes lists.
- `GET /v1/usage` covers the whole partner account. Webhook settings
  (`PUT`/`DELETE /users/me/webhook`) and `PUT /users/me/limits` are
  partner-wide, and VOYGR refuses them with a sub-account. `/signup`,
  `/signup/verify` and `/v1/pricing` are not for Monid's callers.
- `ask_user_mode: "webhook"`: a sub-account cannot register a webhook.
- On `enrich`: `pois`, `sample`, `response_format`, `estimate_only` and the
  deprecated `verify_identity`. On `enrich-batch`: `max_credits`, because
  the price of the whole job is the estimate, known before it runs.
- A recording download. `has_recording` and `recording_status` still say
  whether audio exists.
- No new category, `Unit`, preset or hook.

## Impact

A new connector tree, `connectors/voygr/`, and its 15 endpoint ids and one
resource id in `connectors/ids.lock.json`. No compiler, engine or contract
change: `deno task version:check` reports none.

Running the connector needs a VOYGR API key with sub-accounts enabled. With
an ordinary key, VOYGR answers 403 when the connector creates the
workspace's sub-account, and every run fails before it starts.
