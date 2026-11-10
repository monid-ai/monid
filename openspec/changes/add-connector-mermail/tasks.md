# Tasks: add-connector-mermail

## 1. Provider

- [x] 1.1 Add provider metadata, shared MCP request headers, `x-api-key`
      auth, the Mermail API-credit pool, and the in-band MCP failure
      lifecycle.
- [x] 1.2 Add the `email` category leaf.
- [x] 1.3 Mirror MCP tool arguments for the ten mailbox operations. Strict
      objects, no defaults.

## 2. Endpoints

- [x] 2.1 Add the six read endpoints at 1 credit, each pinned to one MCP
      tool name.
- [x] 2.2 Add `mermail#create-mailbox` at 10 credits, with idempotencyKey
      and a settings object limited to `agentInbox`.
- [x] 2.3 Add send, reply, and forward at 5 credits. Sold fields stay
      nested under `body`.

## 3. Tests

- [x] 3.1 Replay compiled sealed units. Assert the API-key header, the
      absence of `Authorization`, MCP 2026-07-28 headers, and the pinned
      `tools/call` body.
- [x] 3.2 Cover happy results, the credit fold, schema rejection, HTTP 401
      and 402, JSON-RPC errors, MCP `isError`, and malformed success
      envelopes.
- [x] 3.3 Gate the live `list_mailboxes` check on
      `MERMAIL_CREDENTIALS_API_KEY`. No live send or create.

## 4. Wiring

- [x] 4.1 Add the ten Mermail ids to `connectors/ids.lock.json` in sorted
      order. Do not rewrite the lock: `ids:check` on this base already
      reports unrelated NEW and MISSING identities.
- [x] 4.2 Run formatter, `deno check` on the connector, and the Mermail
      tests (23 passed, live list skipped without a key).
