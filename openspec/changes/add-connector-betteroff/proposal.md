# Add a BetterOff household-finance read connector

## Why

Agents need authorized household financial context to answer cash-flow and recurring-charge questions. BetterOff already exposes this context through MCP with household authorization, read scopes, and AI consent. This connector adapts three existing tools to Monid without changing either service's authorization boundaries.

## What Changes

- Add setup-status, cash-flow, and recurring-stream endpoints that send fixed MCP `tools/call` requests.
- Accept BetterOff OAuth access tokens through the transport credential resolver, outside model input. Require the host to bind that resolver to the authenticated caller.
- Validate the version 4 result envelope and each endpoint's data shape while preserving additional fields, decimal money, null values, quality, evidence, warnings, and pagination.
- Preserve HTTP and MCP failures as zero-usage provider errors. Reject invalid successful results through the engine's output contract.
- Add realistic synthetic fixtures, compiled-artifact replay tests, and credential-gated live tests.
- Add the household-finance category and the three endpoint identities. Declare FREE per-call usage and document the BetterOff Core requirement for recurring data.

## Impact

This contribution changes connector definitions, tests, fixtures, and contribution records only. It adds no engine capability, production API route, token store, or OAuth client flow.

Hosted publication requires agreement and verification of per-caller credential resolution, OAuth acquisition and refresh, cross-household isolation, financial-result handling, and offer pricing. One household's token must never serve unrelated callers, including other members of a Monid workspace. Local OAuth isolation tests use synthetic host contexts; they do not verify the hosted relay. These requirements can remain open during connector review.
