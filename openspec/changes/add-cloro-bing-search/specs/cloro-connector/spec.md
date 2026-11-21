# cloro-connector (delta)

## ADDED Requirements

### Requirement: Bing Search endpoint
`cloro#monitor/bing` SHALL call `POST /v1/monitor/bing` with a strict body:
`query` (1 to 3,500 characters), `country`, and optional `include` with
`html` and `aioverview` (a boolean or `{markdown}`).

#### Scenario: The AI Overview is the only add-on
- **WHEN** `cloro#monitor/bing` runs with `include.aioverview` set to
  `true` or to an object
- **THEN** evidence is `{call: 1, ai_overview: 1}` and the card is 7
- **AND** with `include.aioverview: false` or no `aioverview`, evidence is
  `{call: 1}` and the card is 5

#### Scenario: Google-only fields and long queries are rejected
- **WHEN** the body has `pages`, `device`, `state`, `gl`,
  `include.paaAioverview`, no `country`, or a query longer than 3,500
  characters
- **THEN** the run fails with `INVALID_INPUT` and no request is sent

## MODIFIED Requirements

### Requirement: Each endpoint states cloro's rate card
Each endpoint SHALL declare a COMPOSITE model whose `call` line is the base
credits plus 2 (sync surcharge): ChatGPT 7, Gemini 6, AI Mode 6, Bing AI
Mode 6, Google 5, Bing Search 5, Google News 5. The add-on lines SHALL be
counted by estimate and evidence as cloro's `calculateCredits` counts them.

#### Scenario: Seven cloro docs
- **WHEN** the bundle is compiled
- **THEN** it has 7 cloro docs, `cloro#monitor/bing` among them

### Requirement: Shared fns intern
The lifecycle relay, the claim and the error digest SHALL intern to one
fnTable entry each across the 7 docs.

#### Scenario: One entry per shared fn
- **WHEN** the bundle is compiled
- **THEN** the cloro docs carry one distinct key each for
  `usage.consolidate` and `output.fromError`, and the relay is one key (see
  the run-mode requirement)

### Requirement: Run mode follows measured latency
`cloro#monitor/google`, `cloro#monitor/bing`, `cloro#monitor/google/news`
and `cloro#monitor/aimode` SHALL run sync, with no `lifecycle.poll`.
`cloro#monitor/bing` runs sync as Google Search does, until its latency is
measured. `cloro#monitor/chatgpt`, `cloro#monitor/gemini` and
`cloro#monitor/bing/aimode` SHALL run async: an endpoint `lifecycle.start`
that returns RUNNING with no IO, and a `lifecycle.poll` that is the
provider relay and makes the single `/v1/monitor/*` call.

#### Scenario: The sync start is the relay
- **WHEN** the bundle is compiled
- **THEN** the four sync docs share the provider `lifecycle.start` key, and
  the three async docs share one `lifecycle.start` key
