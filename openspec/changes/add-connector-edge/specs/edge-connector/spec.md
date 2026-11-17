# edge-connector (delta)

## ADDED Requirements

### Requirement: Edge provider definition
The edge provider SHALL declare name `edge`, `request.baseUrl`
`https://getedge.cc/api/v1`, auth `presets.auth.bearer()`, timeouts
60 s / 60 s, category `agent-skills`, and a provider-level `usage.model`
of FREE with NO `usage.consolidate`.

#### Scenario: A find is free
- **WHEN** `POST /api/v1/find_skill` returns 200 with ranked skills
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** the payload carries `request_id`, `skills`, and
  `recommendation` unchanged

#### Scenario: A load is free
- **WHEN** `POST /api/v1/use_skill` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** the payload carries `source`, `skill`, `security_state`,
  `request_id`, and `instructions`

#### Scenario: A skill that cannot load is data, zero usage
- **WHEN** `POST /api/v1/use_skill` names a skill not in the catalog
- **THEN** the run completes as HTTP 404, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and the vendor envelope
  `{error, outcome, security_state}` rides through

### Requirement: Two endpoints with strict bodies
The connector SHALL provide `edge#find_skill` and `edge#use_skill`. Find
input SHALL be a strict body: `query` required (3-500 characters),
`keywords` (non-empty, at most 200 characters) and `limit` (integer 1-5)
optional. Use input SHALL be a strict body: `skill` required (1-200
characters); `source` (1-200), `request_id` (1-32), `version` (1-80)
optional. Unknown keys SHALL fail INVALID_INPUT.

#### Scenario: Query too short
- **WHEN** `edge#find_skill` is called with `query: "ab"`
- **THEN** the run fails INVALID_INPUT before the wire

#### Scenario: Skill required
- **WHEN** `edge#use_skill` is called without `skill`
- **THEN** the run fails INVALID_INPUT before the wire
