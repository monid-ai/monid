# Proposal: add-cloro-bing-search

## Why

cloro added Bing Search: `POST /v1/monitor/bing` returns the organic
results of a Bing results page and, on request, the AI Overview (Bing's AI
summary at the top of the page). Both use the same shapes as cloro's
Google Search `organicResults` and `aioverview`. The connector has Bing AI
Mode, which returns the AI answer page for a prompt, but it has no endpoint
for the Bing results page.

## What Changes

- **connectors/cloro/endpoints/bing**: add `cloro#monitor/bing`
  (`POST /v1/monitor/bing`). The body is `query` (at most 3,500 characters,
  the same limit as the Bing AI Mode prompt), `country` (all countries
  except CN, KR and RU; the country sets Bing's market), and optional
  `include.html` and `include.aioverview` (`true` or `{markdown}`). The
  endpoint has no `state`, `device`, `location` or `uule`. It also takes
  `pages` and `first` since 2026-11-22. This change does not add them, so
  the strict body refuses them.
- The card is the Google Search card without pages: 5 credits (3 base + 2
  sync surcharge), plus 2 when `include.aioverview` is `true` or an object.
  cloro's `calculateCredits` charges the Google AI Overview add-on for
  Bing, also when Bing shows no AI summary.
- It runs sync, as Google Search does. Its latency is not measured yet. If
  a measurement shows 20 s or more, a later change moves it to async, as
  Bing AI Mode.
- **connectors/cloro/provider.ts**: the summary, the description and the
  notes name Bing Search.
- **connectors/cloro/provider.test.ts**: cards, estimate, strict input,
  sync list, doc count 7.
- **connectors/ids.lock.json**: add `cloro#monitor/bing` by hand, for the
  reason in remove-cloro-copilot-perplexity design D2 (`--update` would
  also bring in the drift of other connectors).

## Impact

- New endpoint `cloro#monitor/bing`. Additive.
- No engine, schema or compiler change.
