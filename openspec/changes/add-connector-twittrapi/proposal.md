# Proposal: add-connector-twittrapi

## Why

[TwittrAPI](https://www.twittrapi.com) is a REST API for public X (Twitter)
data — tweet search with the full X search syntax, tweets and their reply
threads, quotes and retweeters, profiles (single and batched), timelines,
followers and following, Lists, Communities and trends — sold per call from a
prepaid USD balance ($0.10 per 1,000 calls at the Standard tier,
https://www.twittrapi.com/pricing.json). Submitted by the vendor. Monid's
`twitter` category today is two Apify actors (async runs, per-dataset-item
pricing); TwittrAPI adds synchronous, one-page-per-call reads at a flat
per-call price, plus surfaces the actors do not cover (reply threads, quotes,
retweeters, batched profile lookup, Lists, Communities, trends).

## What Changes

- **connectors/twittrapi** — provider (`presets.auth.header("X-API-KEY")` on
  `https://api.twittrapi.com`, a pinned `User-Agent` and `Accept`) + 18
  synchronous GET endpoints: `search`, `simpletweet/{tweetId}`,
  `tweet/{tweetId}`, `tweet/{tweetId}/quotes`, `tweet/{tweetId}/retweets`,
  `user/by/username/{username}`, `user/users/by/ids`,
  `user/about/{username}`, `user/{userId}/tweets`,
  `user/{userId}/tweets-and-replies`, `user/{userId}/media`,
  `user/{userId}/followers`, `user/{userId}/followings`,
  `user/{userId}/verified-followers`, `lists/tweets`, `lists/members`,
  `trends/{locationId}`, `communities/search/{searchTerm}`. Two ids are
  pinned with `endpoint:` because the vendor's segment is camelCase
  (`tweetsAndReplies`, `verifiedFollowers`) and ids are lowercase (D22).
- **Wire profile** — one provider-level `input.toRequest`: appends
  `format=simple` (the vendor's flat camelCase envelope `{data, nextCursor,
  previousCursor, hasNextPage}`, same price), joins `ids` into one
  comma-separated value (`explode: false`), and JSON-encodes the search
  `filters` object (documented as a URL-encoded JSON object). The engine
  knows only repeated keys and refuses objects, so these spellings are the
  vendor's to make (`toWireQuery` docs). Outputs are relayed verbatim.
- **Billing** — one provider-level rate card: `PER_UNIT · PAGE`, $0.0001
  per page in a `default` pool labelled "US dollars" (the vendor's balance
  and `price_per_call` are USD — the exa / dataforseo posture). Evidence is
  0|1 off the body: 1 when `data` is a non-empty array or an object, 0 for an
  empty page or `data: null` (the vendor charges those; Monid absorbs them —
  the search1api / litescrape posture). Estimate is one page. No
  `consolidate`: no response body carries a meter (the balance headers are
  headers). Provider-level `output.fromError` digests `{error, errorCode?}`.
- **Fixtures** — 24 recorded with a vendor key via `deno task record`
  (trimmed; request headers never captured): one happy page per endpoint, a
  second search with `filters`, recorded empty / `data: null` successes, a
  recorded 401 and a recorded 422. Individual (non-organization) accounts in
  follower / retweeter / reply / quote pages are pseudonymized.
- **connectors/ids.lock.json** — the 18 new ids.
- **openspec/changes/add-connector-twittrapi** — this proposal; no
  `design.md` (no schema/engine contract change, no new Units).

## Capabilities

- `twittrapi-connector`.

## Non-goals

- Write and account endpoints (`/client/*`: post, reply, like, retweet,
  follow, DMs, bookmarks, profile edits) — they act as a logged-in X
  account, not public-data reads.
- `format=raw` (X's GraphQL passthrough) — one output contract per endpoint.
- `/tweet/{tweetId}/favorites` — X shows likers only to the tweet's author,
  so the vendor endpoint is a `POST` carrying that author's cookie and a
  proxy; not a public-data read.
- Jobs, community detail/members/moderators, list details/followers,
  hashflags, username-to-id helpers, account status, friendship lookup,
  `/misc/locations` and `/balance` — candidates for a follow-up; the set here
  mirrors what agents use X data for today.

## Impact

New connector tree plus 18 lines in `ids.lock.json`; no
schema/engine/compiler changes — version stays.
