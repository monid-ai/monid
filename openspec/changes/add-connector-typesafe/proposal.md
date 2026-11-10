# Proposal: add-connector-typesafe

## Why

TypeSafe is live in the hosted Monid catalog (`typesafe#systemone`) but
absent here. Jev answers typed questions about a state with calibrated
probabilities — a one-call primitive for routing, guardrails, matching, and
verification. It ports from monid-services `adaptors/typesafe` (fa6ab6ac),
which is the contract.

## What Changes

- **connectors/typesafe** — base `https://api.typesafe.ai`, bearer auth,
  30 s request and 60 s run budgets (monid-services `config.yml`), and one
  pool in US dollars: TypeSafe publishes $42 per billion input tokens
  (docs.typesafe.ai/models).
- **`typesafe#systemone`** — `POST /v1/systemone`, synchronous.
  - Input is v1's schema with v1's text: `state`, `questions` (`noul`,
    `choice`, `score`), optional `model`. `instructions` is required on
    every question, `score` takes 2–10 levels, `choice` 1–255 options, and
    `questions` at least one entry. v1's two `.refine()` cardinality checks
    ride `.meta({minProperties, maxProperties})` so they reach the compiled
    JSON Schema. The binding defaults `model` to `jev-latest`.
  - `model` is a free string rather than v1's enum (repo rule): a model
    TypeSafe does not serve is its 422, zero-billed.
  - Usage: `PER_UNIT` `TOKEN` at $0.000000042. Evidence is the response's
    `usage.input_tokens` (output tokens are free). The estimate is the
    body's UTF-8 byte length — v1's ceiling (byte-level BPE consumes at
    least one byte per token), counted with the code-point loop
    `octen#embedding` uses.
- **One new category leaf**, `decision-models`, with the hosted manifest's
  text.

## Non-goals

- `assets` (images, base64 or multipart) and the `box` question type. Both
  need the `TypeSafe-Danger-Zone-Images` header and image input, and the
  hosted catalog does not expose them either.

## Impact

- The happy fixture is the monid-services live drill (2026-09-20) verbatim:
  a 526-byte body billed 407 input tokens. The 422 fixture is synthetic.
