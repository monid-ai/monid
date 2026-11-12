# Tasks: add-connector-tako

## 1. Provider and schemas

- [x] 1.1 provider.ts: `X-API-Key` auth, base URL, 60 s timeouts, one
      `default` pool in US dollars, consolidate on
      `usage.total_cost_usd`, `fromError` on `error_message`
- [x] 1.2 Search and contents request schemas mirrored from Tako's
      public OpenAPI spec

## 2. Endpoints

- [x] 2.1 `tako#v3/search`: binding defaults, `variable_cost` and `zdr`
      removed, `call` + `metered` model, estimate and evidence
- [x] 2.2 `tako#v1/contents`: `max_cost_usd` required, `quote_only` and
      `zdr` removed, `call` + `metered` model

## 3. Fixtures and tests

- [x] 3.1 Synthetic fixtures shaped from Tako's public response schemas
- [x] 3.2 Tests: settle on the claim, estimates, wire bodies, schema
      gates, 401 and 422 as zero-billed data, live gated on
      `TAKO_API_KEY`
- [x] 3.4 Live guards on the search hold, because evidence derives from
      the claim and `usage.mismatch` can't catch drift: a search with
      `include_contents` settles at or below its estimate, and every
      card's `export_pricing` fits the $1.60 per 1,000 rows and $0.001
      per card the hold assumes
- [ ] 3.3 Replace the synthetic fixtures with `deno task record` runs

## 4. Wiring

- [x] 4.1 `macro-data`, `weather`, and `sports` leaves
- [x] 4.2 Ids added to `connectors/ids.lock.json` by hand, because
      `ids:check --update` also picks up drift from other connectors
- [x] 4.3 fmt, lint, check, test
