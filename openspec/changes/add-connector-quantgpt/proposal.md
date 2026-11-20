# Proposal: add-connector-quantgpt

## Why

[QuantGPT](https://quantgpt.co) is a US equity research service: a
warehouse of daily market data, fundamentals joined by filing date and
precomputed factors, a backtest engine, and a library of documented
strategies. Its partner API (`https://terminal.quantgpt.co/api/v1`) serves
the same tools its MCP server gives an AI, over plain HTTPS, metered per
call for a reseller. Submitted by the vendor. It adds research tools to the
existing `equities` (Stocks & Funds) leaf: the state of the market, a
multi-factor grade for one stock, a criteria backtest with walk-forward
validation, and a searchable strategy library. Every answer is research
and history, not advice or a forecast, and the API cannot place an order.

## What Changes

- **connectors/quantgpt**: provider (`presets.auth.bearer()` on
  `https://terminal.quantgpt.co/api/v1`, a `default` credit pool labelled
  "US dollars", provider-level `output.fromError` reading `error`) plus 4
  endpoints, all `POST /tools/{name}` with the tool's arguments as the JSON
  body:
  - `tools/market_snapshot`: leaf `PER_CALL` US$0.02.
  - `tools/grade_stock`: leaf `PER_CALL` US$0.03.
  - `tools/search_library`: `FREE`.
  - `tools/run_backtest`: leaf `PER_CALL` US$0.10, ASYNC via
    `lifecycle.start` / `lifecycle.poll`. A fast run answers its finished
    report in the submit and settles at once; a slow run answers
    `result.status: "running"` with a `job_id`, which parks RUNNING and is
    collected by polling `POST /tools/fetch_job {job_id}` on the same
    origin. Only the envelope that carries the finished report is a 2xx
    COMPLETED, so a running answer can never settle a bill; the flat line
    folds exactly once per finished run. Lookup failures (429, 500, 502,
    503, 504, 520 to 524) keep the run RUNNING with a 30 s back-off; a 400
    from `fetch_job` (job failed or id expired) and any other non-2xx is
    terminal, zero-billed data. No `stop`: there is no cancel route, and a
    job never collected is never billed on either side.
- **Input schemas**: each endpoint's `schema/inputs.ts` mirrors the tool's
  published inputSchema (GET /api/v1/tools), optionality only, with the
  vendor's own bounds and enums. Bodies are `.strict()` at the binding:
  the vendor ignores unknown argument names, so a misspelt knob would
  otherwise bill a call that silently ran something else.
- **Provider-level fixture chains** (`connectors/quantgpt/fixtures/`), all
  `synthetic-` prefixed and hand-written from the vendor's documented
  response shapes, with `{{request.url}}` / `{{request.origin}}` bindings.
  No recorded fixtures yet: the partner key is not issued.
- **connectors/ids.lock.json**: the 4 new ids.
- **openspec/changes/add-connector-quantgpt**: this proposal; no
  `design.md` (no schema/engine contract change, no new Units, no new
  category).

## Capabilities

- `quantgpt-connector`.

## Non-goals

- Other QuantGPT tools (raw SQL over the warehouse, rebalance plans and
  event rules are never served to partner keys; `pre_trade_brief` is
  eligible but off for the first launch).
- `fetch_job` as its own endpoint: the poll collects the result, and a
  caller of this connector never holds a job id it would need to collect.

## Impact

New connector tree plus 4 lock entries; no schema/engine/compiler changes,
so the engine version stays.
