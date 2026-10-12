# Proposal: add-connector-valyu

## Why

Valyu provides source-aware retrieval across web, news, academic, financial,
and proprietary datasets, alongside URL content extraction. A native connector
adds these capabilities through the existing synchronous engine contract.

## What Changes

- `connectors/valyu`: API-key provider with `POST /v1/search` and synchronous
  `POST /v1/contents`, faithful request-schema mirrors, and binding-level guards.
- One US-dollar credit pool. Actual vendor receipts settle the bill; integer
  nanodollar evidence avoids whole-dollar rounding. Missing receipts fall back
  to explicit per-result prices, excluding failed extractions.
- Contents estimates its documented per-URL price for unique URLs. Search has
  no fixed or input-derived total quote; its empty estimate explicitly means no
  admission hold, not a free call. `max_price` is CPM, not a dollar budget.
- Synthetic replay fixtures, compiled-artifact tests, credential-gated live
  tests, usage documentation, and updated endpoint identity lock.
- Extend sensitive-file ignore patterns so connector credentials and private
  key files cannot be accidentally staged.

## Capabilities

- `valyu-connector`.

## Non-goals

Answer, DeepResearch, asynchronous Contents jobs, webhooks, and permission-gated
Search result caps above the standard 20. No schema/engine, taxonomy, dependency,
or version change.

## Sources

Valyu's [Search](https://docs.valyu.ai/api-reference/endpoint/search) and
[Contents](https://docs.valyu.ai/api-reference/endpoint/contents) references,
including their published OpenAPI examples. ISO date-time bounds are supported
by the official SDK for historical-cache searches.
