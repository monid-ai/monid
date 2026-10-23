# tinyfish-connector (delta)

## ADDED Requirements

### Requirement: The agent run bills executed AI steps
`tinyfish#automation/run` SHALL be an async endpoint that starts with
`POST /v1/automation/run-async`, polls `GET /v1/runs/{id}` with
`screenshots=none&html=none`, and price a `PER_UNIT` `CREDIT` line at 0.016
US dollars per step. Its evidence SHALL be the terminal record's
`num_of_steps` (0 when absent) whatever the terminal status; its estimate
SHALL be `max_steps + 2`, with `max_steps` defaulting to 150 at the binding.
A poll answering 429 or 5xx SHALL throw (retriable); any other non-2xx SHALL
complete as data.

#### Scenario: A failed run still bills
- **WHEN** the terminal record is `FAILED` with `num_of_steps: 2`
- **THEN** evidence is `{CREDIT: 2}` and the fold is 0.032 dollars

#### Scenario: Output is allowlisted
- **WHEN** the terminal record carries `streaming_url`, `video_url`,
  `steps`, `profile_id`, and `browser_config`
- **THEN** the output holds only `run_id`, `status`, `result`, `error`,
  `num_of_steps`, `started_at`, and `finished_at`

### Requirement: Stopping the agent settles executed steps
The stop fn SHALL request `POST /v1/runs/{id}/cancel`, then drain up to three
reads of the run. A terminal record with steps SHALL settle as COMPLETED; a
`CANCELLED` record with zero steps SHALL return nothing (STOPPED_UNSETTLED);
a record that never turns terminal SHALL be UNRESOLVED.

#### Scenario: Cancel before the first step
- **WHEN** the drained record is `CANCELLED` with `num_of_steps: 0`
- **THEN** the stop verdict is STOPPED_UNSETTLED

### Requirement: Profiles are workspace-owned resources
`tinyfish/browser-profile` SHALL be a free resource provisioned by
`browser-profiles/provision` and released by `browser-profiles/release`.
`setup-session`, `setup-save`, and `setup-cancel` SHALL gate on
`$.body.profileId`; the agent run SHALL check an optional `profileId` with
`utils.resources.owned` before any upstream call and send
`use_profile: true, profile_id` only for an owned profile. `set_as_default`
SHALL never be sent.

#### Scenario: Foreign profile on the agent run
- **WHEN** the agent run names a `profileId` the workspace does not own
- **THEN** the run completes 404 with zero usage and no upstream call

#### Scenario: Provision drops device-identity material
- **WHEN** `POST /v1/profiles` answers with `fingerprint_seed`
- **THEN** the seed persists `{name, proxyCountryCode}` and the output omits
  `fingerprint_seed`
