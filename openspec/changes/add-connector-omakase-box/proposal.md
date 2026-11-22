# Add Omakase Box connector

## Why
Let agents find paid coding work and inspect the task and owner payment facts without credentials.

## What
Add provider `omakase-box` (display name Omakase Box), FREE read-only GET list and detail endpoints. Posting remains local via the Agent Skill (https://github.com/shouteck/omakase-skills) and CLI, installed with `npx -y omakase-box setup`, outside Monid. Descriptions put poster onboarding before solver discovery and warn that rewards do not guarantee selection or payment. Monid cannot post work or trigger payment.

## Evidence and limits
On 2026-11-22 curl returned exactly equal parsed JSON from https://omakasebox.dev/bounties.json and https://open-bounty-board.box-platform.workers.dev/bounties.json; use the former. Both lists were empty. Combined language/min_reward/query/sort/limit filters were accepted live; limit=26 and sort=bogus returned errors. Semantics were checked in the local box-platform src/query.ts (filterOf) and src/feed.ts (findBounties, bountyDetail).

No credentials is supported without engine changes: explicit z.object({}) credential schema and identity auth.inject. Omitting credentials would incorrectly inherit the default apiKey requirement.

The detail identity is /bounties/{id}, with wire path /bounties/{id}.json: the existing identity grammar cannot represent a suffix after a placeholder. List identity is /bounties for consistency. No shared schema changes.

Every payment way (manual, Stripe one-click, pay on merge) needs a person: one-click and pay on merge exist only for posted bounties after the owner sets up a card and allows them, so the descriptions say a human approves rewards and pays. This connector neither initiates nor guarantees any payment. The live empty feed cannot prove successful detail reads: empty list and 404 are real recordings, populated list/detail are explicitly synthetic source-shaped examples, not observed bounties.

## Impact
Connector and OpenSpec files only; no engine, taxonomy, version or shared configuration changes.
