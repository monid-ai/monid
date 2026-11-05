# Proposal: remove-cloro-copilot-perplexity

## Why

cloro discontinued its Copilot and Perplexity endpoints. Both products now
block access for logged-out sessions, and cloro uses only logged-out
sessions. The cloro API rejects `/v1/monitor/copilot` and
`/v1/monitor/perplexity` with HTTP 400 `MODEL_UNAVAILABLE` and charges no
credits. cloro lists both under "Unsupported providers" in
https://cloro.dev/docs/guides/providers.

An endpoint that always fails must not stay in the catalog. An agent that
selects it gets an error for every call.

## What Changes

- **connectors/cloro**: remove `cloro#monitor/copilot` and
  `cloro#monitor/perplexity` (the endpoint and input files). The connector
  has 5 endpoints: ChatGPT, Gemini, AI Mode, Google and Google News.
- **connectors/cloro/provider.ts**: the summary and the notes name only the
  remaining engines.
- **connectors/cloro/provider.test.ts**: the rate-card cases, the async list
  and the doc count follow the 5 endpoints. The check that the plain
  assistant engines share one estimate entry is removed, because Gemini is
  now the only one.
- **connectors/ids.lock.json**: remove the two cloro identities by hand (see
  design.md).

## Impact

- Breaking for a caller that uses either id. The vendor already rejects
  those calls, so no working call stops working.
- No engine, schema or compiler change.
