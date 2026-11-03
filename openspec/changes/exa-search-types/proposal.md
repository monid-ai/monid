# Proposal: exa-search-types

## Why

Exa prices `/search` by search type, but `exa#search` prices every call at
the `auto` rate and cannot send the cheapest type at all:

- `type: "lite"`, Exa's $0.004 search for agent loops, fails input
  validation (`expected one of "auto"|"instant"|…`), so no caller can reach
  it.
- The doc pins one $0.007 base for every type. Exa bills $0.004 for
  `lite`, `instant` and `neural`, $0.007 for `auto` and `fast`, $0.012 for
  `deep-lite` and `deep`, and $0.015 for `deep-reasoning` (verified live
  2026-11-02 against `costDollars.total`). The estimate and the published
  card are wrong for six of the eight types.
- Result summaries (`contents.summary`, $0.001 per result) are not
  modeled, so the derived fold disagrees with the vendor's claim whenever a
  caller asks for them.

An agent choosing a search tool reads the capability and the price from
the endpoint it discovers. A single `/search` endpoint carrying an
"auto" price hides both the cheap lite path and the deep research path.

## What Changes

- **`exa#search`**: `type` accepts `lite`. The base price becomes one
  PER_UNIT cell per published rate (`lite_search`, `standard_search`,
  `deep_search`, `deep_reasoning_search`), with `1` on the cell `type`
  selects (D19 counting rule, the minimax per-cell posture). A `summary`
  line meters `contents.summary` per returned result. Meta copy rewritten
  to say when to use each type and what each costs.
- **`exa#search/lite`** (new): `POST /search` pinned to `type: "lite"`,
  with the parameter set lite accepts. $0.004 per call including 10
  results, $0.001 per result above 10.
- **`exa#search/deep`** (new): `POST /search` restricted to `deep-lite`,
  `deep` (default) and `deep-reasoning`, for `outputSchema` research with
  per-field grounding. Per-type cells as on `exa#search`, 180 s request
  budget.
- Fixtures for both new endpoints recorded live (vendor request
  diagnostics removed). `connectors/ids.lock.json` gains the two ids.

## Capabilities

- `exa-connector`.

## Non-goals

- `/contents` pricing per content type, `/answer`, and the Agent API.
- `objective` and other beta-gated search fields.

## Impact

Connector-only. No schema, compiler or engine change: `ENGINE_VERSION`
unchanged, no new `Unit`, hook or category. The public `exa#search` input
widens by one enum value; no id is renamed or removed.
