# Proposal: add-connector-readme-diagram

## Why

README Diagram (diagram.flisk.si) turns a public GitHub README into an animated
SVG diagram, deterministically (no model): it reads the headings, code fences
and the stack the README mentions and draws three cards. That gives Monid
agents a README-to-picture tool they can run on any public repository. The
service is free and keyless, which no connector declares yet (see `design.md`
D1); it needs no new engine capability.

## What Changes

- Add the `readme-diagram` provider: base URL `https://diagram.flisk.si`, an
  empty credentials shape, a pass-through `auth.inject`, no credit system.
- Add `/diagram`, a GET to `/{owner}/{repo}.svg` with `owner` and `repo` path
  parameters. FREE, category `image-generation` (an existing leaf). The native
  path carries placeholders, so the endpoint states its own id (D1 of apollo).

## Capabilities

- `readme-diagram-connector`.

## Non-goals

- `POST /render` (Markdown in, SVG out): the engine's transport always sends a
  JSON-stringified body, and `/render` reads the body as raw Markdown, so it
  cannot be called through this engine today (see `design.md` D2).
- The preview page and the one-click pull request flow of the service.

## Impact

New connector tree only. No schema, engine, or category changes.
