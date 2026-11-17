# Proposal add-connector-xquik

## Why

Xquik (xquik.com) is an X (Twitter) data API. Agents on Monid can't read X
data from it today. This adds its 7 most used reads, with no engine change.

## What Changes

- **connectors/xquik** holds 7 synchronous GET endpoints against
  `https://xquik.com/api/v1`, with `x-api-key` auth and 120 s timeouts.
  - `xquik#x/tweets/search` searches tweets with X search operators and
    filters. PER_UNIT `RESULT`, 1 credit per returned tweet, `limit`
    default 20, at most 10,000.
  - `xquik#x/tweets/{id}` reads 1 tweet by ID or URL. PER_CALL 1 credit.
  - `xquik#x/users/search` searches profiles by name or username. PER_UNIT
    `RESULT`, 1 credit per returned profile, `pageSize` default 20, at
    most 100.
  - `xquik#x/users/{id}` reads 1 profile by username, user ID or profile
    URL. PER_CALL 1 credit.
  - `xquik#x/users/{id}/tweets` lists 1 account's tweets, newest first.
    PER_UNIT `RESULT`, 1 credit per returned tweet, `pageSize` default 20,
    at most 10,000.
  - `xquik#x/users/{id}/followers` and `xquik#x/users/{id}/following` list
    the profiles following 1 account, and the profiles it follows.
    PER_UNIT `RESULT`, 1 credit per returned profile, `pageSize` default
    200, at most 10,000.
- **One credit pool** `default` ("Xquik credits"). Xquik meters 1 credit
  per returned tweet, profile or follower and 1 per lookup. A credit's
  dollar price depends on the account's plan, so it is the broker card's
  job.
- **Xquik's meter settles each run.** Every answer carries
  `X-Xquik-Credits-Charged`, the credits that request took. A provider
  `lifecycle.start` relays each request and carries the header into state,
  as cloro does, and the provider `usage.consolidate` claims it. The
  header reads 0 for a page a filter empties and for a page sent again
  with the same cursor within 10 minutes. The engine prunes a zero claim
  back to the derived fold, so the list reads' evidence also counts 0 rows
  then, as ahrefs does. A missing or malformed header falls back to the
  rate card.
- Query schemas mirror the most used parameters of Xquik's OpenAPI spec and
  are strict, since Xquik prices some other filters, such as `topic`, above
  the read price. Tweet search and user tweets take `sinceId`, `maxId` and
  `keywords`, so a caller can read only what's new.
- The lookups reject a bare `search` or `batch` user ID and a bare `search`
  or `top` tweet ID, which would route to Xquik's search, batch or top
  reads. The `@search` form still reads an account with that name.
- `deno task record` recorded every happy and error fixture against the
  live API at 2 rows or fewer. Third-party profile identities in the
  followers, following and search fixtures are replaced with placeholders.
  The `cursor-page`, `replayed-cursor` and `since-id` fixtures carry the
  live meter header, which `x-xquik-credits-charged` on the recorder's
  response header allowlist keeps.

## Capabilities

- `xquik-connector`.

## Non-goals

- Xquik's write actions, monitors, webhooks and bulk extraction jobs.
- Other read endpoints, such as replies, quotes, lists and communities,
  which can follow in later changes.

## Impact

The change adds a connector tree, 7 ids in `connectors/ids.lock.json` and
`x-xquik-credits-charged` to the fixture recorder's response header
allowlist. It changes no schema or engine code. `ENGINE_VERSION` stays the same, with no
new `Unit`, preset, hook or category leaf, since `twitter` already exists.
