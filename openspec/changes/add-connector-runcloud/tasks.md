# Tasks: add-connector-runcloud

## 1. Vendor surface

- [x] 1.1 Map the routes, bodies and responses from the published run.cloud
      SDK (`SimulatorClient`, `SimulatorSession`,
      `SIMULATOR_INTERACTION_LIMITS`, `SIMULATOR_KEYS`, `SIMULATOR_BUTTONS`)
      and https://docs.run.cloud
- [x] 1.2 Pin the rate: $0.02 per active minute, metered per second
      (https://run.cloud/pricing)

## 2. Provider and resource

- [x] 2.1 `provider.ts`: bearer auth, base url, category, the pooled-internals
      strip on both output slots
- [x] 2.2 `resources/simulator-session`: `{platform}` data, DAY clock, the
      `active-time` estimated line and its reconciler, verify, release
- [x] 2.3 Category leaf `mobile-simulators`

## 3. Endpoints (11)

- [x] 3.1 `start-session` (provisions, idempotent start, short defaults)
- [x] 3.2 `stop-session` (releases, issues the DELETE)
- [x] 3.3 `tap`, `swipe`, `type-text`, `press-key`, `press-button`,
      `open-url` (uses)
- [x] 3.4 `get-session`, `read-screen` (trimmed, tap-ready), `device-logs`
      (reads)

## 4. Fixtures and tests

- [x] 4.1 16 synthetic provider-level chains
- [x] 4.2 Replay tests: provisioning, idempotency and defaults on the wire,
      the ownership gate on every session endpoint, interaction wire bodies,
      schema gates, read-screen projection and cap, resource meter, verify and
      release
- [ ] 4.3 Record real chains and run `deno task test:live` once a run.cloud
      key is in the platform's secret store

## 5. Verification

- [x] 5.1 `deno fmt --check`, `deno task lint`, `deno task check`
- [x] 5.2 `deno task test`
- [x] 5.3 `deno task compiler:compile`
