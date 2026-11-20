# Tasks: add-connector-quantgpt

## 1. Connector

- [x] 1.1 `provider.ts`: bearer auth, `https://terminal.quantgpt.co/api/v1`,
      US dollar pool, `equities` category, provider-level `fromError`
      (`error`)
- [x] 1.2 Four endpoint defs + per-endpoint input mirrors, strict at the
      binding; flat US$0.02 / US$0.03 / US$0.10, `search_library` FREE
- [x] 1.3 `run_backtest` start/poll lifecycle over `fetch_job`; billed once
      per finished run, never on a running answer or a poll; no stop
- [x] 1.4 Synthetic provider-level fixture chains (`synthetic-` prefix,
      `{{request.url}}` / `{{request.origin}}` bindings)
- [x] 1.5 Replay + schema-gate + gated-live tests per endpoint
- [x] 1.6 `deno task check && deno task test` pass with no network
- [x] 1.7 Live tests run against a vendor-issued partner key (2026-11-21):
      all four endpoints pass, including a slow `run_backtest` that parked
      RUNNING, polled `fetch_job` and settled once. Fixtures stay
      synthetic chains (fixture strategy v2), as in other connectors
