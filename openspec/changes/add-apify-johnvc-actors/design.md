# Design: add-apify-johnvc-actors

Decision record for the first johnvc tranche. Precedent: the apify
connector itself (`connectors/apify/provider.ts`, the D24–D29 cards of
add-async-run-protocol). Each entry below names a construct that is new to
the repo; everything else follows the existing apify docs to the letter.

## D1 — `setup` and `startup` are flat fees

Nine of the 18 actors publish a `setup` event and describe it as a
"one-time fee per Actor run"; two of them (`Baidu-Search-Scraper`,
`us-congress-financial-disclosures-and-stock-trading-data`) publish it with
NO start-shaped event, so a `PER_CALL` line on them tripped the drift
suite's shape check (`FLAT_EVENT` only knew the `start` family and bare
`request`). The regex now also matches `^setup$` and `^startup$`
(`scripts/drift/apify.ts`). Modeling `setup` as a metered 1 was rejected:
fns never write flat keys, and the provider's generic evidence keys rows
onto the FIRST `PER_UNIT` component. Verified against the live fleet on
2026-09-22: no other actor publishes either name, so no existing verdict
changes.

## D2 — Two published events on one id join by their sum

`naver-search-api` publishes both the platform's `apify-actor-start`
($0.00001) and its own `actor_start` ($0.00005); `normalizeEventName` maps
both to `actor_start`, and the rate join used to take the FIRST match. Both
fire once per run, so the line pins their SUM ($0.00006) and `checkPricing`
now sums `livePrice` over every joined event, with scheduled-pin
reconciliation over any one of them. The model schema has no per-line
`vendor` field, so the join stays derived (D28).

## D3 — Pre-charged lines evidence the input cap

`Baidu-Search-Scraper` charges `page_processed` for the whole
`max_pagination` before fetching (`src/main.py:233`) and the Congress actor
charges `transaction_processed` for `Max_Results` before querying
(`src/main.py:289`). Money follows the charge, so those docs' evidence
reads the cap from `data.input.body` rather than counting rows; counting
rows would under-bill any short result set. Precedent for reading the body
in evidence: `streamers/youtube-scraper` (`oldestPostDate`).

## D4 — Block quantization

`yandex-reverse-image-search` bills `result_returned` per started block of
10 rows (`src/main.py:399-403`), and a no-results run still bills one
block for its summary row. Estimate and evidence both round to the next
multiple of 10; the chain's 2 rows settle 10.

## D5 — The platform's per-row line is modeled, never excluded

`apify-default-dataset-item` ($0.00001/row) is published on 16 of the 18
cards. It is 100% of `YoutubeTranscripts`' per-video price and 10% of
`google-images-api`'s, and on `fuelprices` it IS the price, so it is a
line on every card that publishes it (the COVERAGE rule, D29), evidenced as
`rows.length` — the platform charges every stored row, error rows included
(add-async-run-protocol review, 2026-09-07). The actor's own main line
excludes error rows only where the actor's source proves that event is not
charged for them, cited per doc.

## D6 — Derived page counts where rows are results

`Google-Jobs-Scraper` pushes one row per job and charges a page only once it
yields a job (`src/googlejobs.py:564,640`); `google-scholar-api` pushes one
row per result and charges `query_executed` per page in its two paginated
modes. Neither row carries a page marker, so evidence derives pages from
the delivered rows and the page size (`ceil(rows / 10)`, `num`), capped by
the input. This under-bills a trailing empty page — the same documented
residual class as the provider's lagging-total posture
(`provider.ts:40-43`) — and the doc `notes` say so.
