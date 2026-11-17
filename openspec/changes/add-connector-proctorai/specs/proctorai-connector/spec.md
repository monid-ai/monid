# proctorai-connector (delta)

## ADDED Requirements

### Requirement: Proctor AI provider definition
The proctorai provider SHALL declare name `proctorai`, `request.baseUrl`
`https://agent.proctorai.io`, auth `presets.auth.bearer()`, timeouts
300 s / 300 s, one credit pool `default` ("Proctor AI gradings"), a
provider-level `usage.model` of PER_CALL 0.4 gradings, and a
`usage.consolidate` that plucks `$.billing` from the response and settles
`billing.gradingsCharged` as the `default` credit.

#### Scenario: A graded sheet settles the vendor's receipt
- **WHEN** `POST /api/v1/grade` returns 200 with
  `billing: {gradingsCharged: 0.4, balance: …}`
- **THEN** usage is `{credits: {default: 0.4}, evidence: {CALL: 1}}`
- **AND** the output carries `marks` and `questions` but no `billing`

#### Scenario: Out of prepaid gradings is data
- **WHEN** the vendor answers 402 `insufficient_balance`
- **THEN** the run completes with `isProviderError` true and usage
  `{credits: {}, evidence: {}}`

#### Scenario: A bad key is data
- **WHEN** the vendor answers 401 `invalid_api_key`
- **THEN** the run completes with `isProviderError` true, zero usage, and
  the vendor's `{error: {code, message}}` envelope rides through

### Requirement: Grade endpoint input
`proctorai#grade` (`POST /api/v1/grade`, category `education`) SHALL take
a strict body: `questions` required (1–100; each `prompt` 1–4000 chars,
optional `id`, `maxMarks` > 0, `expectedAnswer`, `options` 2–10,
`subQuestions` 1–20 each with `id`, `prompt` and `maxMarks`); optional
`pages` (1–20 strings), `answers` (1–500 `{questionId, subQuestionId?,
text}`), `title`, `level`, `studentName`, `instructions` (≤ 2000). Unknown
keys SHALL be rejected. The cross-field rule (at least one of `pages` /
`answers`) is stated in `notes`, since refinements do not compile.

#### Scenario: Too many pages
- **WHEN** `pages` has 21 entries
- **THEN** the run fails INVALID_INPUT before any request is sent

#### Scenario: A sub-part without marks
- **WHEN** a sub-question omits `maxMarks`
- **THEN** the run fails INVALID_INPUT
