# Proposal: add-connector-typesafe

## Why

TypeSafe is live in the hosted Monid catalog (`typesafe#systemone`) but
absent here. Jev answers typed questions about a state with calibrated
probabilities — a one-call primitive for routing, guardrails, matching, and
verification. It ports from monid-services `adaptors/typesafe` with no
contract change.

## What Changes

- **connectors/typesafe** — base `https://api.typesafe.ai`, bearer auth,
  30 s request and run budgets (monid-services parity), and one pool in US
  dollars: TypeSafe publishes $42 per billion input tokens
  (docs.typesafe.ai/models).
- **`typesafe#systemone`** — `POST /v1/systemone`, synchronous.
  - Input is the vendor mirror (docs.typesafe.ai/api): `state`, `questions`
    (`noul`, `choice`, `score`), optional `model`. The binding defaults
    `model` to `jev-latest`, so hosted callers that omit it keep working.
  - Usage: `PER_UNIT` `TOKEN` at $0.000000042. Evidence is the response's
    `usage.input_tokens` (output tokens are free). The estimate is the
    body's UTF-8 byte length — an estimate, not a guaranteed ceiling, since
    TypeSafe does not document how it counts input tokens; it counts bytes
    via `encodeURIComponent`, because closed-term fns have no `TextEncoder`.
  - The input mirror follows the vendor's nullable fields: every question's
    `instructions`, and the noul `criteria` with its `true`/`false` texts.

## Differences from the hosted definition

- The hosted schema is stricter than the vendor: it requires
  `instructions`, requires 2+ score levels, and accepts only three model
  names. This mirror follows the vendor (`instructions` optional, 1–10
  score levels, any model name); a model the vendor rejects is a 422,
  zero-billed.

## Non-goals

- `assets` (images, base64 or multipart) and the `box` question type. Both
  need the `TypeSafe-Danger-Zone-Images` header and image input, and the
  hosted catalog does not expose them either.

## Impact

- Fixtures are SYNTHETIC, shaped from docs.typesafe.ai/api.
