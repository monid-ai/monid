# Proposal: add-connector-huntapi

## Why

HuntAPI (https://www.huntapi.com) — Download the video or audio of public media URLs, as background jobs. 3 synchronous GET endpoints, one API key, no new engine capability.

## What Changes

- **connectors/huntapi** — 3 endpoints, auth the `x-api-key` header, 60 s timeouts:
  - `huntapi#v1/video/download` (`GET /v1/video/download`, `youtube`, `tiktok`, `instagram`): Start downloading a public video; returns a job id. PER_CALL, 1 HuntAPI credits.
  - `huntapi#v1/audio/download` (`GET /v1/audio/download`, `youtube`, `tiktok`, `instagram`): Start extracting the audio of a public video; returns a job id. PER_CALL, 1 HuntAPI credits.
  - `huntapi#v1/jobs/{id}` (`GET /v1/jobs/{id}`, `youtube`, `tiktok`, `instagram`): Read the status and result of a download job. Free.
- **Billing**: HuntAPI bills 1 credit per download request; reading a job's status is free (published pricing; measured in the Treg catalog run, 2026-11-09). No response carries a usage receipt, so the derived fold settles.
- Fixtures: `synthetic-` happy and 401 chains, shaped from the vendor OpenAPI spec and live calls made for the Treg catalog (2026-11-09). Replace via `deno task record` when `HUNTAPI_API_KEY` exists.

## Capabilities

- `huntapi-connector`.

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION` unchanged, no new `Unit`, no new preset, no new hook, no new category leaf (`instagram`, `tiktok`, `youtube` already exist).
