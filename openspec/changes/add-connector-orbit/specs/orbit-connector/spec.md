# orbit-connector (delta)

## ADDED Requirements

### Requirement: Orbit provider definition
The orbit provider SHALL declare name `orbit`, `request.baseUrl`
`https://api.orbitsearch.com`, auth `presets.auth.bearer()`, timeouts 60 s
request / 900 s run / 5 s poll, and the single credit pool `default`
("Orbit credits"). It SHALL declare a provider-level `output.fromError` that
normalizes `{status: "failed", error: {code, message}}` into
`{message, code?, raw}`. It SHALL NOT declare a lifecycle, because the
profile read is a plain synchronous request and a provider-level `start`
would replace its declarative execution. It SHALL NOT declare a
`usage.consolidate`, because Orbit's search and enrichment responses carry no
meter.

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 402
  `{status: "failed", error: {code: "developer_api_credits_insufficient", ...}}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output carries `code` and `message` beside the raw envelope

### Requirement: Inputs mirror the published v3 OpenAPI
Every `schema/inputs.ts` SHALL mirror its v3 component with optionality only —
no `.default()`, no invented fields. Orbit's own documented defaults SHALL be
applied at the binding in `endpoint.ts`, so estimates read concrete numbers.
Orbit's cross-field rules (a search carries one of `query`, `intent` or
`signals`) SHALL live in the descriptions, since refinements do not survive
JSON Schema compilation and Orbit answers a request that satisfies none of
them with a `400`, which arrives as data.

#### Scenario: Vendor defaults are materialized
- **WHEN** the compiled `orbit#v3/search` body schema is inspected
- **THEN** `limit` defaults to 20, `profile_depth` to `partial`,
  `candidate_discovery` to false, `candidate_discovery_limit` to 10, and
  `include_profile` to true

#### Scenario: The vendor's own caps are the mirror's caps
- **WHEN** the compiled `orbit#v3/enrich` body schema is inspected
- **THEN** `profile_ids` carries `minItems` 1 and `maxItems` 20, and the
  required set is `["profile_ids", "operation"]`

### Requirement: A search settles the work it did, derived from observation
`orbit#v3/search` SHALL carry a lifecycle whose `start` executes the submit and
whose `poll` reads `GET /v3/search/{search_id}` until the status is terminal.
The poll SHALL accumulate every `profile_id` it observes with status
`generating` or `enriching` into the fn-owned `state.data.built` bag, carrying
the previous tick's ids forward by hand (whole-state semantics, D21). The
endpoint SHALL price a COMPOSITE of `index_search` (1 credit per 10 RESULTs),
`candidate_discovery` (1), `partial_profile` (5) and `full_profile` (10), and
`evidence` SHALL settle: one `index_search` count per non-failed result whose
`sources` carries `search`; the requested depth line for each result observed
mid-build; and `candidate_discovery` for each remaining non-failed result whose
`sources` carries `candidate_discovery`.

#### Scenario: A built profile settles at its depth
- **WHEN** a partial-depth search reports two index results, one of which was
  seen `generating` and then `enriching` before ending `ready`
- **THEN** usage is `{credits: {default: 6}, evidence: {index_search: 2,
  partial_profile: 1}}`

#### Scenario: A search answered from the index bills no build
- **WHEN** a search returns twelve `ready` results that were never observed
  mid-build
- **THEN** usage is `{credits: {default: 2}, evidence: {index_search: 12}}`

#### Scenario: A union of origins stays off the cached line
- **WHEN** a result's `sources` carries both `search` and
  `candidate_discovery`
- **THEN** it is counted on the discovery line alone, because Orbit excludes
  discovery rows from the cached-result count and bills the row against the
  single origin that created it

#### Scenario: A candidate merely resolved bills 1
- **WHEN** a discovery search returns one index result and two
  `candidate_discovery` results that were never observed mid-build
- **THEN** usage is `{credits: {default: 3}, evidence: {index_search: 1,
  candidate_discovery: 2}}`

#### Scenario: A submit-time failure reads like a poll-time one
- **WHEN** the submit answers 200 with `status: "failed"` and its reason at
  `candidate_discovery_failure` (or, for an enrichment, at `failure`)
- **THEN** the start phase lifts that reason into Orbit's own
  `{status, error: {code, message}}` envelope before settling, so the same
  `output.fromError` reads a submit-time and a poll-time failure alike

#### Scenario: A failed search is ours/theirs and bills nothing
- **WHEN** the status route answers 200 with `status: "failed"`
- **THEN** the run reports `httpStatus` 500 with `providerHttpStatus` 200,
  usage `{credits: {}, evidence: {}}`, and an output shaped like Orbit's own
  error envelope so one mapper reads it

#### Scenario: A failed status lookup keeps the run alive
- **WHEN** a status read answers 408, 429 or ANY 5xx while the search is
  running
- **THEN** the poll returns RUNNING with a backed-off cadence rather than
  settling, because the search keeps running and keeps drawing credits

#### Scenario: The estimate is the ceiling the caller authorized
- **WHEN** `orbit#v3/search` is estimated with `limit` 100 and
  `profile_depth: "full"`
- **THEN** the estimate is 1,010 credits — ten index blocks plus a full build
  for every person the search may return

### Requirement: An enrichment settles on dispatch, and a no-op settles at zero
`orbit#v3/enrich/{profile_id}` SHALL carry a lifecycle whose `start` records
whether Orbit dispatched work — `status: "running"` on the submit, or the
`regenerate` operation, which always rebuilds — into `state.data.dispatched`,
and whose `poll` follows the status route Orbit names in `links.status`. The
endpoint SHALL price a COMPOSITE of `partial_profile` (5) and `full_profile`
(10), and `evidence` SHALL draw a depth line only when work was dispatched AND
the terminal status is `completed` AND `generation_level` reached the depth
asked for (2 for `partial`, 3 for `full` and `regenerate`).

#### Scenario: A dispatched build settles at its depth
- **WHEN** a `full` enrichment answers 202 `running` and completes at
  `generation_level` 3
- **THEN** usage is `{credits: {default: 10}, evidence: {full_profile: 1}}`

#### Scenario: A profile already at depth settles at zero
- **WHEN** a `full` enrichment answers 200 `completed` on the submit at
  `generation_level` 3
- **THEN** usage is `{credits: {}, evidence: {}}`, although the snapshot is
  otherwise identical to the dispatched case

### Requirement: The batch fans out over its children
`orbit#v3/enrich` SHALL carry a lifecycle that reads the child `request_id`s
from the submit, polls only the children still running on each tick, and, once
none are running, reads EVERY child once more to assemble
`{request_id, status, results}` with one current snapshot per profile. The
parent status SHALL be `completed_with_errors` when any child ended other than
`completed`. Only children Orbit dispatched SHALL draw a depth line.

#### Scenario: Only the dispatched child draws
- **WHEN** a `partial` batch of two returns one child `running` and one child
  already `completed`, and the running child completes at level 2
- **THEN** usage is `{credits: {default: 5}, evidence: {partial_profile: 1}}`
  and the output carries both children under `request_id` `BATCH1`

### Requirement: One status-read retry rule across every lifecycle
Every lifecycle SHALL treat a status read answering `408`, `429` or any `5xx`
as a failed LOOKUP rather than finished work, returning RUNNING so the run
survives — Orbit's error guide puts `429` and every temporary server failure
in one retry class, and the work keeps drawing credits while the lookup is
unavailable. When the response carries `Retry-After` (seconds), it SHALL set
the next tick's cadence, clamped to [1s, 120s]; otherwise a fixed backoff
applies. Every lifecycle SHALL poll the route Orbit names in `links.status`,
falling back to the documented path shape.

#### Scenario: An uncommon 5xx is held like a 503
- **WHEN** a search status read answers `599`
- **THEN** the poll returns RUNNING rather than settling the run

#### Scenario: Retry-After sets the cadence
- **WHEN** a transient status read carries `Retry-After: 7`
- **THEN** the next tick is scheduled 7 seconds out

#### Scenario: A transient final read re-opens a batch child
- **WHEN** the batch's final sweep reads a completed child and gets a `503`
- **THEN** that child is re-opened for a later tick instead of being
  published as `failed`, so its depth line survives into evidence

### Requirement: The request states what was priced
Usage fns SHALL read `operation` and `profile_depth` from
`data.input.body` — both are request fields Orbit priced the work against,
and one operation applies to a whole batch. The terminal response's
`generation_level` SHALL remain the source for the depth actually reached.

#### Scenario: A missing echo does not change the price
- **WHEN** a dispatched `partial` enrichment completes at
  `generation_level` 3 and its snapshot omits `operation`
- **THEN** usage is `{credits: {default: 5}, evidence: {partial_profile: 1}}`

### Requirement: A profile read is one flat credit under a declared identity
`orbit#v3/profile/{profile_id}` SHALL declare the public identity
`/v3/profile/{profile_id}` while calling the vendor's own
`GET /v3/enrich/{profile_id}`, because that path is shared with the build and
two defs on one path collide. It SHALL price `PER_CALL` 1 credit.

#### Scenario: The identity is declared and the call is the vendor's
- **WHEN** the compiled doc is inspected
- **THEN** its id is `orbit#v3/profile/{profile_id}` and its request url is
  `https://api.orbitsearch.com/v3/enrich/{profile_id}`
