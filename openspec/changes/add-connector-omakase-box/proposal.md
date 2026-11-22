# Add Omakase Box connector

## Why
Let agents post existing issues as pending bounties, find paid coding work and inspect the task and owner payment facts without Omakase credentials.

## What
Add provider `omakase-box` (display name Omakase Box), FREE GET list/detail endpoints and POST `bounties/import`. An agent opens an issue on a public repository it owns or can write to, imports it as pending, and posts the returned exact approval line from a GitHub OWNER/COLLABORATOR/MEMBER account. The board checks approvals about every 15 minutes, budget permitting. Unapproved sessionless imports expire after 14 days. A human pays; this connector cannot trigger payment. Descriptions explain the full posting and solving loop and warn that rewards do not guarantee selection or payment. The Agent Skill/CLI remain an alternative for local repository packaging.

## Evidence and limits
On 2026-11-22 curl returned exactly equal parsed JSON from https://omakasebox.dev/bounties.json and https://open-bounty-board.box-platform.workers.dev/bounties.json; use the former. Both lists were empty. Combined language/min_reward/query/sort/limit filters were accepted live; limit=26 and sort=bogus returned errors. Semantics were checked in the local box-platform src/query.ts (filterOf) and src/feed.ts (findBounties, bountyDetail).

No credentials is supported without engine changes: explicit z.object({}) credential schema and identity auth.inject. Omitting credentials would incorrectly inherit the default apiKey requirement.

The detail identity is /bounties/{id}, with wire path /bounties/{id}.json: the existing identity grammar cannot represent a suffix after a placeholder. List identity is /bounties for consistency. No shared schema changes.

Every payment way (manual, Stripe one-click, pay on merge) needs a person: one-click and pay on merge exist only for posted bounties after the owner sets up a card and allows them. Approval comments may be posted by the agent from an authorized GitHub account; a human still pays. This connector neither initiates nor guarantees any payment. The live empty feed cannot prove successful detail reads: empty list and 404 are real recordings, populated list/detail are explicitly synthetic source-shaped examples, not observed bounties. Import contract and bounds were checked against local Omakase PF51 source (no live import): POST /api/agents/import, strict issue/reward JSON, 1–100000 whole USD, pending approval, null importer, 1024-byte limit, global 10/minute and half-GitHub-budget protection. Import fixtures are synthetic; no real issue, comment or bounty is created by this change.

## Impact
Connector and OpenSpec files only; no engine, taxonomy, version or shared configuration changes.
