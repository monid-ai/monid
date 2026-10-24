# Proposal: add-connector-mermail

## Why

Mermail is a public MCP server for agent mailboxes: Streamable HTTP at
`https://console.mermail.app/mcp`, with OAuth for interactive clients and
`x-api-key` for automation. Agents need those mailbox operations in
`discover` with the published API-credit rate card, without being able to
call an arbitrary tool on that server.

## What Changes

- Add provider `mermail` with homepage `https://mermail.app`, docs
  `https://docs.mermail.app/ai/mcp`, category `email`, header auth
  `x-api-key`, and one credit pool labeled `Mermail API credits`.
- Add ten catalog identities over `POST https://console.mermail.app/mcp`.
  Each identity pins one MCP `tools/call` name. Callers pass only that
  tool's arguments.
  - `mermail#list-mailboxes` → `list_mailboxes` (1)
  - `mermail#get-mailbox` → `get_mailbox` (1)
  - `mermail#create-mailbox` → `create_mailbox` (10)
  - `mermail#list-emails` → `list_emails` (1)
  - `mermail#search-emails` → `search_emails` (1)
  - `mermail#get-email` → `get_email` (1)
  - `mermail#get-email-context` → `get_email_context` (1)
  - `mermail#send-email` → `send_email` (5)
  - `mermail#reply-to-email` → `reply_to_email` (5)
  - `mermail#forward-email` → `forward_email` (5)
- Pin MCP 2026-07-28 headers and request metadata. Amounts are Mermail API
  credits from the public credit table (read 1, email_send 5, provision
  10). They are usage units, not dollars. Responses carry no vendor meter,
  so each endpoint is flat PER_CALL.
- Lift HTTP non-2xx, JSON-RPC errors, MCP `isError`, and malformed success
  envelopes to provider errors at zero usage. Success exposes
  `result.structuredContent`.
- Add an `email` leaf category.

## Capabilities

- `mermail-connector`.

## Non-goals

- Interactive OAuth. This connector injects the caller's API key.
- Mermail Agent Wallet, webhooks, drafts, scheduled send, folders, labels,
  destructive deletes, and the keyless `/api/agent/v1` payment API.
- Any connector-engine, schema ABI, or hosted discovery change.
- A dollar price. Plan rates differ, so conversion stays on the broker card.

## Impact

New connector and OpenSpec trees, one category leaf, and ten entries in the
endpoint identity lock. No engine version or configuration change.
