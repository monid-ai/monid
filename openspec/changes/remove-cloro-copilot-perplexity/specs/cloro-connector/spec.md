# cloro-connector (delta)

## ADDED Requirements

### Requirement: Bing AI Mode endpoint
`cloro#monitor/bing/aimode` SHALL call `POST /v1/monitor/bing/aimode` with a
strict body: `prompt` (1 to 3,500 characters), `country`, optional `state`,
and optional `include` with `markdown` and `html`.

#### Scenario: State targeting is the only add-on
- **WHEN** `cloro#monitor/bing/aimode` runs with `state: "NY"`
- **THEN** evidence is `{call: 1, state_targeting: 1}` and the card is 8
- **AND** its estimate shares one fnTable key with `cloro#monitor/gemini`

#### Scenario: Unknown fields and long prompts are rejected
- **WHEN** the body has `include.rawResponse`, no `country`, or a prompt
  longer than 3,500 characters
- **THEN** the run fails with `INVALID_INPUT` and no request is sent

## MODIFIED Requirements

### Requirement: Each endpoint states cloro's rate card
Each endpoint SHALL declare a COMPOSITE model whose `call` line is the base
credits plus 2 (sync surcharge): ChatGPT 7, Gemini 6, AI Mode 6, Bing AI
Mode 6, Google 5, Google News 5. The add-on lines SHALL be counted by estimate and evidence as
cloro's `calculateCredits` counts them.

#### Scenario: No Copilot or Perplexity endpoint
- **WHEN** the bundle is compiled
- **THEN** it has no `cloro#monitor/copilot` and no
  `cloro#monitor/perplexity` doc, and it has 6 cloro docs

### Requirement: Shared fns intern
The lifecycle relay, the claim and the error digest SHALL intern to one
fnTable entry each across the 6 docs.

#### Scenario: One entry per shared fn
- **WHEN** the bundle is compiled
- **THEN** the cloro docs carry one distinct key each for
  `usage.consolidate` and `output.fromError`, and the relay is one key (see
  the run-mode requirement)

### Requirement: Run mode follows measured latency
`cloro#monitor/google`, `cloro#monitor/google/news` and
`cloro#monitor/aimode` SHALL run sync, with no `lifecycle.poll`.
`cloro#monitor/chatgpt`, `cloro#monitor/gemini` and
`cloro#monitor/bing/aimode` SHALL run async: an
endpoint `lifecycle.start` that returns RUNNING with no IO, and a
`lifecycle.poll` that is the provider relay and makes the single
`/v1/monitor/*` call.

#### Scenario: The poll is the relay
- **WHEN** the bundle is compiled
- **THEN** the three async docs share one `lifecycle.start` key
