# Design: add-apify-benthepythondev-actors

Five benthepythondev Store actors on the existing `apify` provider. Precedent:
add-apify-johnvc-actors. Only the constructs below are new; everything else
follows the existing apify docs.

## D1 — Inputs that keep state on the runner's account are dropped

`remote-jobs-aggregator` (`onlyNew`, `monitorId`, `firstRunMode`,
`resetState`), `reddit-scraper` (`onlyNew`, `watchName`) and
`socialblade-scraper` (`trackHistory`) keep a memory in a key-value store of
the account that runs the actor. Through Monid that is one account for every
caller, so one caller's watch would hide rows from another. The bindings
`.omit()` them; the mirrors in `schema/inputs.ts` stay faithful (D25). Debug
switches are dropped with them.

## D2 — A published event the actor never charges is a zero line

`remote-jobs-aggregator` publishes `salary-extracted` on its card, but its
`src/main.py` charges dataset rows only. The line is modeled (COVERAGE, D29)
and evidenced and estimated as 0.

## D3 — Pins ahead of schedule

Three cards have a scheduled price change (2026-11-04 Yahoo start event,
2026-11-09 remote jobs and Arbeitsagentur rows). The pins are the scheduled
prices, which the drift suite reconciles as "ahead of schedule"; each doc's
comment names the price billing until then.

## D4 — Start events

Each actor runs at 512 MB, so `apify-actor-start` (one event per started GB)
fires once per run and is a PER_CALL line.
