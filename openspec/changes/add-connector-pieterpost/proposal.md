# Proposal: add-connector-pieterpost

## Why

PieterPost turns structured recipient data and text into physical letters and
postcards. Its public API is a safer fit for Monid than proxying the full remote
MCP server: the API uses a stable server-side bearer key, while the MCP server
uses user-approved OAuth connections with short-lived access tokens.

The first connector should make the useful pre-send workflows discoverable
without exposing wallet-funded direct send or pooled account data. A review link
requires the user to continue in PieterPost. A hosted checkout link requires the
payer to complete checkout before fulfillment starts.

## What Changes

- Add provider `pieterpost` with bearer auth, base URL
  `https://pieterpost.com`, and FREE Monid usage.
- Add `pieterpost#create-compose-link`, which maps a required connector
  `idempotencyKey` to PieterPost's `Idempotency-Key` header and creates a
  short-lived review URL.
- Add `pieterpost#create-checkout-link`, which supports text-only letter and
  postcard checkout payloads and returns an unpaid hosted checkout URL.
- Add the `postal-mail` category leaf.
- Add synthetic replay fixtures shaped from the live public API documentation
  and focused schema, request-mapping, success, and provider-error tests.

## Capabilities

- `pieterpost-connector`.

## Non-goals

- Wallet-funded `POST /v1/orders` direct send. It spends PieterPost credits and
  needs an explicit Monid tariff and shared-account policy before catalog use.
- Wallet, order lookup, top-up, API-key management, or Address Book endpoints.
  A shared provider credential would expose pooled account state without a
  resource/ownership design.
- Attachments, uploads, custom letter stamps, and custom postcard fronts in the
  first connector release.
- Proxying PieterPost's OAuth MCP server or exposing OAuth tokens as connector
  input.

## Impact

One provider, two endpoints, one taxonomy leaf, and the identity lock update.
No engine, compiler, ABI, or document-format change.
