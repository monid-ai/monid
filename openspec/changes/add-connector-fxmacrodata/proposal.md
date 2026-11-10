# Proposal: add-connector-fxmacrodata

## Why

An agent asked "what did US CPI print last month, and when is the next one?"
either recalls a number from training data or scrapes a news page. Neither
gives it the published value, the time it was released, or the date of the
next release. FXMacroData serves exactly that from central banks and national
statistics offices for 22 currencies: latest values, release history with
announcement timestamps and revisions, the forward release calendar, and daily
FX reference rates.

The catalog has no macro or FX leaf today. Nothing under `equities` or the
crypto leaves answers "when is the next ECB decision" or "what was Japan's
last unemployment print".

## What Changes

- **connectors/fxmacrodata**: 5 sync GET endpoints against
  `https://api.fxmacrodata.com`:
  - `fxmacrodata#v1/data_catalogue/{currency}`: the indicator slugs a
    currency publishes, with coverage.
  - `fxmacrodata#v1/announcements/{currency}/latest`: latest and previous
    value of every indicator.
  - `fxmacrodata#v1/announcements/{currency}/{indicator}`: release history
    for one indicator, paginated, with the series selectors
    (frequency, seasonality, annualization, revisions, ...).
  - `fxmacrodata#v1/calendar/{currency}`: scheduled releases, nearest first.
  - `fxmacrodata#v1/forex/{base}/{quote}`: daily FX reference rates with
    optional technical indicators.
- **The key is optional.** USD announcements, the USD calendar and the
  catalogue for every currency answer without one (USD history is the last
  90 days and releases are delayed 15 minutes, both stated in the response).
  `auth.credentials` declares `apiKey` optional and `auth.inject` adds
  `X-API-Key` only when it resolves, so the connector works out of the box
  and `FXMACRODATA_API_KEY` unlocks the rest. Other currencies and FX rates
  return a 401 `api_key_required` without a key, which settles as a provider
  error.
- **FREE everywhere.** FXMacroData has no per-call meter: the keyless surface
  is free and a key is a flat subscription. No response carries a usage
  receipt, so there is no `usage.consolidate`.
- **Faithful mirrors.** Inputs mirror the published OpenAPI with optionality
  only; `limit`/`offset`/`page` bounds sit at the binding. The indicator slug
  is a string rather than the 124-value enum, because that enum is the union
  across currencies and grows with coverage; the catalogue endpoint lists the
  valid slugs per currency. No `input.toRequest`, no `output.fromResponse`.
- **One new category leaf**, `economic-data`.
- Fixtures: every chain is RECORDED (2026-10-15, keyless): catalogue,
  latest, inflation history and calendar for USD, and the 401 from
  `/v1/forex/EUR/USD`. The two large ones are trimmed to two rows.

## Capabilities

- `fxmacrodata-connector`.

## Non-goals

- The rest of the API (COT positioning, commodities, central-bank news,
  rate differentials, predictions). Same shape, can follow once these five
  have settled.
- The hosted MCP server. This connector uses the REST API.

## Impact

New connector tree and one category leaf. No schema or engine contract
change: `ENGINE_VERSION` unchanged, no new unit, preset or hook.
