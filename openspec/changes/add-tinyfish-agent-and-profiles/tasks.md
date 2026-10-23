# Tasks: add-tinyfish-agent-and-profiles

## 1. Scope

- [x] 1.1 Diff the hosted catalog (`api.monid.ai/public/v1/providers/tinyfish`,
      10 endpoints) against this repo (2)
- [x] 1.2 Port from monid-services `adaptors/tinyfish` (launched 2026-09-30):
      the agent run, the profile resource, and five profile endpoints
- [x] 1.3 Establish that browser sessions cannot port yet: their resource
      ops need `api.browser.tinyfish.ai`, a second resource origin

## 2. Provider and resource

- [x] 2.1 `request.baseUrl` = `https://agent.tinyfish.ai`; `default` pool
      in US dollars
- [x] 2.2 `resources/browser-profile`: verify, release, the domains view

## 3. Endpoints (6)

- [x] 3.1 `automation/run`: start, poll, stop-with-drain; per-step billing
      at the public list rate; keyless `reads` + in-fn ownership check
- [x] 3.2 `browser-profiles/provision` and `/release`
- [x] 3.3 `browser-profiles/setup-session`, `/setup-save`, `/setup-cancel`

## 4. Identity and tests

- [x] 4.1 Add the 6 endpoint ids and `tinyfish/browser-profile` to
      `connectors/ids.lock.json`
- [x] 4.2 Synthetic fixtures + one `endpoint.test.ts` per endpoint and
      `resources/browser-profile/resource.test.ts`
- [x] 4.3 `deno task check && deno task test`

## 5. Follow-ups

- [ ] 5.1 Record real fixtures with a TinyFish key (`deno task record`)
- [ ] 5.2 Contract: a resource-level request origin, then port
      `browser-sessions/provision`, `/release`, and the per-minute
      `browser-session` resource (an ESTIMATED line reconciled from
      `GET /usage`)
- [ ] 5.3 Host config: release `tinyfish/browser-profile` immediately (no
      billing period to wind down)
