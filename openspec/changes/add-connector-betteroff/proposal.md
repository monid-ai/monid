# Add the BetterOff household-finance connector

## Why

BetterOff exposes 29 tools for household finances, corrections, and action requests. The original contribution covered only three reads and predated Core-only agent access. This update covers the current published catalog without changing either service's authorization boundaries.

## What Changes

- Expose 21 reads and eight writes using fixed MCP tool calls. Read tools cover setup, accounts, cash flow, transactions, recurring streams, net worth, investments, debts, observations, and action status.
- Add category, recurring-kind, and debt-detail proposals; wallet, bank, and vault requests; cancellation; and opt-in feedback. Financial corrections and action execution stay behind authenticated BetterOff approval. Wallet actions require signing. Cancellation and feedback take effect when called.
- Require BetterOff Core for every call, including reads and feedback. Paid, complimentary, and payment-grace Core access qualify; Free and trials do not. BetterOff enforces entitlement and tool-specific scopes on each call. FREE remains the zero per-call usage model.
- Keep caller-bound OAuth credentials outside tool input. Strict inputs cannot change identity, destination, or tool name. Transfer requests require an idempotency key; bank account discovery accepts empty input. Feedback requires an explicit approval flag reflecting actual consent.
- Validate current v4 input and output contracts, preserve additional result fields and precise decimal amounts, and retain compatibility with earlier v4 responses on the original three endpoints.
- Extend compiled replay, concurrent synthetic-household isolation, and authorization-denial tests to all 29 tools. Add input bounds, required result fields, review links, state, receipt, cancellation-denial, and idempotency forwarding tests.

## Impact and limits

This contribution changes connector definitions, tests, fixtures, and contribution records only. It adds no engine capability, production API route, token store, OAuth client flow, dependency, or financial execution endpoint.

The open-source engine can dispatch all 29 calls and preserve review links. Hosted caller credential selection, OAuth refresh/disconnect coordination, and saved-result privacy remain unverified. Host confirmation UX for state-writing tools also remains unverified; descriptions and an approval boolean do not prove user consent. Hosted publication requires two-household integration checks, private result handling, appropriate scopes, and confirmed offer pricing. Local synthetic tests do not satisfy those requirements.
