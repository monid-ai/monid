# Tasks: add-cloro-bing-search

## 1. Vendor surface

- [x] 1.1 Read the request body, the countries and the card from cloro's
      `bingSchema` and `calculateCredits` (3 base, +2 for the AI Overview,
      +2 for each page after the first)

## 2. Connector

- [x] 2.1 Add `endpoints/bing/` (`cloro#monitor/bing`), sync run, card 5
      plus 2 for the AI Overview and 2 for each page after the first
- [x] 2.2 `provider.ts`: summary, description and notes name Bing Search

## 3. Tests and lock

- [x] 3.1 `provider.test.ts`: cards, estimate, strict input, sync list,
      doc count 7
- [x] 3.2 `ids.lock.json`: add `cloro#monitor/bing` (see
      remove-cloro-copilot-perplexity design D2)
- [x] 3.3 `deno check` and `deno test -A connectors/cloro` pass
- [ ] 3.4 Record a real `cloro#monitor/bing` fixture and measure the sync
      latency (needs a cloro API key)
