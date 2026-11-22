# Omakase Box read-only connector

## Requirements
- Provider Omakase Box uses https://omakasebox.dev, no credential fields, identity auth injection, and FREE usage.
- List sends GET /bounties.json with optional language (case-insensitive exact repository language), min_reward (inclusive whole USD), query (literal title/repository substring, at most 100 characters), sort (newest or reward), limit (1–25, upstream default 10).
- Newest sorts creation descending then id; reward sorts amount descending then creation descending then id.
- Detail sends GET /bounties/{id}.json with bt- plus twelve lowercase hexadecimal digits. Nonexistent ids return provider error data, not a transport exception.
- Responses pass through unchanged, including freshness, untrusted poster text, owner payment claims and pagination metadata. This port exposes only the requested five filters, not cursor navigation.
- Solver pitch precedes CLI poster pitch and human-payment caveats in provider and endpoint descriptions. Posting and payment are not connector actions.
- Replay requires no network or credentials, covers populated, empty and error responses and rejects invalid input before transport.
