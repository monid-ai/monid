# Proposal: add-connector-readme-score

## Why

README Score (readme.flisk.si) scores a README out of 100, deterministically
(no model), and names the line to change and the text to add for every miss.
That gives Monid agents a documentation-quality check they can run on a public
repository or on a draft. The service is free and keyless, which no connector
declares yet (see `design.md` D1); it needs no new engine capability.

## What Changes

- Add the `readme-score` provider: base URL `https://readme.flisk.si`, an empty
  credentials shape, a pass-through `auth.inject`, no credit system.
- Add `/api/score`, a GET with a required `repo` (`owner/repo`) and an optional
  `type`. FREE.
- Add `/api/score/markdown`, a POST to the same wire path `/api/score` with a
  required `readme` and optional `type` and `website`. FREE. It states its own
  `endpoint` id because GET and POST share the path (D22).
- Add the `documentation` leaf to `connectors/categories.ts`; no existing leaf
  fits a README quality tool.

## Capabilities

- `readme-score-connector`.

## Non-goals

- The badge, the `/mcp` route, and the HTML result pages of the service.
- Any metering. If README Score ever charges, the usage model changes then.

## Impact

New connector tree plus one category leaf. No schema or engine changes.
