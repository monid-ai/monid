# Proposal add-connector-xquik

## Why

Xquik (xquik.com) is an X (Twitter) data API. Agents on Monid can't read X
data from it today. This adds its 7 most used reads, with no engine change.

## What Changes

- **connectors/xquik** holds 7 synchronous GET endpoints against
  `https://xquik.com/api/v1`, with `x-api-key` auth and 120 s timeouts.
  - `xquik#x/tweets/search` searches tweets with X search operators and
    filters. PER_UNIT `RESULT`, $0.00015 per returned tweet, `limit`
    default 20, at most 10,000.
  - `xquik#x/tweets/{id}` reads 1 tweet by ID or URL. PER_CALL $0.00015.
  - `xquik#x/users/search` searches profiles by name or username. PER_UNIT
    `RESULT`, $0.00015 per returned profile, `pageSize` default 20, at
    most 100.
  - `xquik#x/users/{id}` reads 1 profile by username, user ID or profile
    URL. PER_CALL $0.00015.
  - `xquik#x/users/{id}/tweets` lists 1 account's tweets, newest first.
    PER_UNIT `RESULT`, $0.00015 per returned tweet, `pageSize` default 20,
    at most 10,000.
  - `xquik#x/users/{id}/followers` and `xquik#x/users/{id}/following` list
    the profiles following 1 account, and the profiles it follows.
    PER_UNIT `RESULT`, $0.00015 per returned profile, `pageSize` default
    200, at most 10,000.
- **One credit pool** `default` ("US dollars"). Xquik publishes $0.00015
  per returned tweet, profile or follower. There's no `usage.consolidate`,
  since Xquik reports its charge only in the `X-Xquik-Credits-Charged`
  response header. Evidence counts the returned rows, which is what Xquik
  bills.
- Query schemas mirror the most used parameters of Xquik's OpenAPI spec and
  are strict, since Xquik prices some other filters, such as `topic`, above
  the read price.
- The lookups reject a bare `search` or `batch` user ID and a bare `search`
  or `top` tweet ID, which would route to Xquik's search, batch or top
  reads. The `@search` form still reads an account with that name.
- A page sent again with the same cursor costs nothing at Xquik but settles
  its rows here, since only the response header reports that charge.
  `meta.notes` says so.
- `deno task record` recorded every happy and error fixture against the
  live API at 2 rows or fewer. Third-party profile identities in the
  followers, following and search fixtures are replaced with placeholders.

## Capabilities

- `xquik-connector`.

## Non-goals

- Xquik's write actions, monitors, webhooks and bulk extraction jobs.
- Other read endpoints, such as replies, quotes, lists and communities,
  which can follow in later changes.

## Impact

The change adds a connector tree and 7 ids in `connectors/ids.lock.json`. It
changes no schema or engine code. `ENGINE_VERSION` stays the same, with no
new `Unit`, preset, hook or category leaf, since `twitter` already exists.
