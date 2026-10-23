# Proposal: add-tinyfish-agent-and-profiles

## Why

The hosted Monid catalog lists 10 TinyFish endpoints; this repo carries 2
(search, fetch). Of the 8 missing, 6 port onto the existing contract: the AI
browser agent and the Browser Context Profile family that gives it saved
logins. monid-services launched them on 2026-09-30
(`adaptors/tinyfish/endpoints/automation-run.ts`, `profiles-*.ts`,
`resources/browser-profile.ts`), with the vendor behavior drilled live there.

## What Changes

- **provider.ts** — `request.baseUrl` becomes `https://agent.tinyfish.ai`
  (resource ops always target the provider origin), and the provider declares
  the `default` pool in US dollars. FREE stays the provider default; search
  and fetch keep their own hosts and are unchanged.
- **resources/browser-profile** — `tinyfish/browser-profile`: saved login
  state, free to hold ($0 fixed line, monthly clock). `verify` =
  `GET /v1/profiles/{id}` (404 ⇒ inactive), `release` =
  `DELETE /v1/profiles/{id}` (2xx/404/410 conclude; 409 and anything else
  throw), `views.domains` = the live saved-domain summary, allowlisted.
- **endpoints (6)**:
  - `automation/run` — async (`POST /v1/automation/run-async`, poll
    `GET /v1/runs/{id}`, stop = cancel + drain). `PER_UNIT` at $0.016
    per AI step, TinyFish's public dollar price (tinyfish.ai/pricing); steps
    count under `Unit.CREDIT` because the contract has no STEP unit. Evidence is
    the terminal `num_of_steps` for COMPLETED, FAILED, and CANCELLED alike;
    the estimate is `max_steps + 2` (the measured wrap-up overshoot), with
    `max_steps` defaulting to the vendor's 150 at the binding. Output is
    allowlisted (no streaming/video URLs, steps, or profile fields).
  - `browser-profiles/provision` — `POST /v1/profiles`; PROVISIONS the
    resource; drops `fingerprint_seed`; never sends `set_as_default`.
  - `browser-profiles/release` — RELEASES the resource; local ack, no
    upstream call (the host runs `lifecycle.release`).
  - `browser-profiles/setup-session`, `setup-save`, `setup-cancel` — keyed
    `reads` gates on `$.body.profileId`; camelCase inputs mapped to the
    vendor's snake_case in `toRequest`.
- **Optional `profileId` on the agent run** — a keyed binding treats an
  absent key as INVALID_INPUT, so the run declares a keyless `reads` binding
  and `start` checks `utils.resources.owned` itself (the saperly
  call-artifact pattern). A foreign id is the uniform 404, upstream
  untouched; only an owned id sends `use_profile: true, profile_id`.

## Non-goals

- **Browser sessions** (`browser-sessions/provision`, `/release`, and the
  per-minute `browser-session` resource). Its ops live on
  `api.browser.tinyfish.ai` while profiles live on `agent.tinyfish.ai`;
  resource ops can only target the one provider origin, and cross-origin
  calls get no credential (D16). It needs a resource-level origin in the
  contract — a separate engine change.
- Release timing. Profiles have no billing period, so the host should
  release immediately; that is host config, not def data.

## Impact

- Fixtures are SYNTHETIC, shaped from the monid-services live drills. A
  recording pass with a TinyFish key should replace them.
- Search and fetch compile to the same docs; no engine, compiler, or
  contract change; no version bump.
