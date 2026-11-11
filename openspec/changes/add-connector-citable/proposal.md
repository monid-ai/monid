# Proposal: add-connector-citable

## Why

Citable (citable.flisk.si) checks whether AI answer engines can crawl, read and
cite one web page: it fetches the page like a crawler without JavaScript and
returns a deterministic score out of 100 with a fix for every failed check.
That gives Monid agents a page-level AI-visibility audit next to the existing
`geo` tools. The service is free and keyless, which no connector declares yet
(see `design.md` D1); it needs no new engine capability.

## What Changes

- Add the `citable` provider: base URL `https://citable.flisk.si`, an empty
  credentials shape, a pass-through `auth.inject`, no credit system.
- Add `/api/check`, a GET with a required `url` and an optional `fresh=1`.
  FREE, category `geo` (an existing leaf).

## Capabilities

- `citable-connector`.

## Non-goals

- The `/mcp` and `/badge/*.svg` routes of the service.
- Any metering. If Citable ever charges, the usage model changes then.

## Impact

New connector tree only. No schema, engine, or category changes.
