# Proposal: add-connector-truelist

## Why

Truelist (truelist.io) is an email verification API: syntax, MX and SMTP
checks plus catch-all, disposable and role-address detection. It sits
next to Hunter's `email-verifier` as a dedicated, cheaper verifier, and
the inline call is synchronous — one endpoint, Bearer auth, no new
engine capability. Reference: https://truelist.io/docs/api
(base URL `https://api.truelist.io`, `Authorization: Bearer`,
10 requests/second).

## What Changes

- **connectors/truelist** — 1 endpoint, Bearer auth, 60 s timeouts:
  - `truelist#api/v1/verify_inline` (`POST /api/v1/verify_inline?email=`):
    one address per call; returns `emails[0]` with `email_state`,
    `email_sub_state`, domain, canonical, MX record and `did_you_mean`.
    PER_UNIT `RESULT`, 1 Truelist credit per verified address; `unknown`
    (incl. `timed_out`) and catch-all results bill 0.
- **One credit pool** `default` ("Truelist credits"). No
  `usage.consolidate`: responses carry no usage receipt.
- Fixtures: all RECORDED live 2026-10-15 (ok, role, invalid, catch-all,
  unknown/timed_out, 401, 429); the one personal mailbox in the `ok`
  chain is replaced with a placeholder.

## Capabilities

- `truelist-connector`.

## Non-goals

- Batch verification (`POST /api/v1/verify`): the reference documents
  neither its response body nor a route to read batch results, so no
  start/poll pair can be built yet.
- `GET /me` (free account read; echoes the account's API tokens).

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION`
unchanged, no new `Unit`, preset, hook, or category leaf
(`people-enrichment` already exists, as for Hunter's verifier).
