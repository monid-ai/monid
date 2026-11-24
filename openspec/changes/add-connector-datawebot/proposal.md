# Change: Add the datawebot connector

## Why

Monid's catalog has single-store ecommerce endpoints, but no tool that searches
an arbitrary online shop by keyword, reads one product page on it, or returns
every seller's price for one product. datawebot's public API does all three
through one request router, priced in its own credits.

## What changes

- Add the `datawebot` provider: bearer authentication against
  `https://api.datawebot.com`, the `default` pool in datawebot credits, 30 s
  request / 120 s run / 5 s poll timeouts.
- Add `datawebot#search` and `datawebot#product`, both on
  `POST /v1/requests` (capability `search` / `product`, set by `toRequest` and
  not exposed to callers), each with a `lifecycle.start` / `poll` pair: the
  router answers inline or with `status: "working"` and a `request_id`, and
  `GET /v1/requests/{id}` (free) finishes it. A product read with more than
  100 variants answers the first 100 and a `next_cursor`; the product
  lifecycle reads the remaining pages (free, at most 50) and joins the
  variants into one answer, so no request id is handed to callers.
- Add `datawebot#sites` (`GET /v1/sites`), FREE.
- Bill on the vendor's own meter: `meta.credits_used` is both the evidence and
  the claim (D27). A `status: "failed"` answer that used no credits settles as
  a 502 provider error (zero usage); one that loaded a page and used credits
  settles as success at that amount, so the bill equals the vendor's.
- Remove `meta.credits_left` (the key holder's balance) from every output and
  error.
- Add shared synthetic fixtures, sealed-unit replay tests and credential-gated
  live tests for all three endpoints. Register the three identities in
  `ids.lock.json`.

## Scope

Connector-only: no engine ABI, schema, version or existing provider changes.
Sources are the vendor's public OpenAPI (`https://api.datawebot.com/openapi.json`)
and API reference (`https://www.datawebot.com/docs/api/reference`), checked
2026-11-23. Fixtures are synthetic until a provider key is issued.
