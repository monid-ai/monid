# Proposal: add-connector-loyaltie

## Why

Loyaltie (loyaltie.com) is a US marketplace for everyday products from
independent brands: catalog search, product and brand detail, and a cart
link the person opens to pay. It already serves agents through a public,
keyless MCP server (`POST https://loyaltie.com/api/ucp/mcp`, streamable
HTTP, stateless, plain JSON responses). The catalog has no shopping
connector today. Four synchronous endpoints, no new engine capability.

## What Changes

- **connectors/loyaltie** — 4 endpoints, each one MCP `tools/call`:
  - `loyaltie#search-catalog` (`search_catalog`): query plus price,
    regular-delivery and brand-location filters, pagination.
  - `loyaltie#get-product` (`get_product`): one product by id.
  - `loyaltie#get-maker` (`get_maker`): one brand by id or store link.
  - `loyaltie#build-cart-link` (`build_cart_link`): a loyaltie.com cart
    link for 1–20 line items. The person reviews and pays on
    loyaltie.com; the agent never pays.
- **Auth**: none. Empty credential shape; `inject` passes the request
  through.
- **Usage**: FREE (no pool, no consolidate). Loyaltie charges nothing per
  call.
- **Attribution**: every call adds `src: "api"` and `agent_id: "monid"`
  to the tool arguments.
- **Category**: new leaf `shopping` in `connectors/categories.ts`.
- **Fixtures**: happy paths and get-product not-found are RECORDED
  (2026-11-17). Provider errors are `synthetic-` (see design D3).

## Capabilities

- `loyaltie-connector`.

## Non-goals

- Paying or placing orders. Checkout happens on loyaltie.com.
- The server's cart tools (`create_cart`, `get_cart`) and
  `lookup_catalog` / `share_feedback`.

## Impact

New connector tree and one category leaf. No engine/schema contract
change: `ENGINE_VERSION` unchanged, no new `Unit`, preset or hook.
