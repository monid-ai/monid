# Proposal: add-connector-pressfront

## Why

Agents asked about a person, a brand or a moment online keep needing the same
answer: **who started it, who spread it, and what they're saying.** Pressfront
Trace reads everyone posting at or about an X or Bluesky name (thousands of
accounts per trace) and returns exactly that: counts by side and tone (read by
a language model and labeled so), the post it started from, the account whose
post set off the jump, the accounts others came through, the claims, who moved
together, the pace, and a link to every post. Every answer also carries a
plain-Markdown brief with numbered sources, written for an LLM to explain.

Its API is a clean fit for the connector standard: one base URL, bearer auth,
flat US-dollar prices per call, `{error, message}` errors, and a job protocol
for the one slow operation. Nothing about it needs a new engine capability.

## What Changes

- **connectors/pressfront**: 4 endpoints against
  `https://pressfront.co/api/v1`, bearer auth, one `default` credit pool in
  US dollars, a provider-level `output.fromError` for `{error, message}`. No
  vendor meter rides the responses, so there is no consolidate: the pinned
  PER_CALL rates are the bill.
  - `GET /instant/{handle}` (async, PER_CALL $0.49): never empty. Traced in
    the last 24 h = 200 in about a second. Not traced = Pressfront searches
    the name now (about a minute) and answers 202 `searching` until done.
    `lifecycle.start` sends the call with `wait=20`; a 202 parks RUNNING and
    `lifecycle.poll` repeats the same call until the 200. Only the 200 bills;
    202s, a 502 `search_failed` and other non-2xx are zero-billed.
  - `POST /traces` (async, PER_CALL $4.99): a fresh trace, about 4 to 7
    minutes. `lifecycle.start` submits; `lifecycle.poll` long-polls
    `GET /traces/{id}?wait=20` and, on done, reads the story and the brief
    and settles them with the job `id`. A failed trace settles as a
    synthesized 500 (zero-billed). No cancel exists, so no `stop`.
  - `GET /traces/{id}` (FREE): the status read the poll makes, exposed.
  - `GET /traces/{id}/{part}` (PER_CALL $0.05): one part of a finished
    trace (brief, story, accounts, posts, timeline, groups, who, sites,
    evidence), with the accounts / posts filters and paging.
- **Fixtures**: `instant-ok`, `instant-none`, `trace-read-accounts` and
  `trace-status-done` are real recordings made with Pressfront's public demo
  key, whose one trace is INVENTED (no real person appears anywhere).
  `synthetic-trace-done` / `synthetic-trace-failed` are synthetic chains in
  the real shapes, because the demo key cannot start traces; their story,
  brief and done status bodies are real demo recordings.
- **ids.lock.json** gains the four endpoint ids.

## Impact

- Connector-only change: no engine, schema or compiler change, no version
  bump.
- Live tests run with `PRESSFRONT_API_KEY`; the public demo key
  `pf_live_DemoKeyForPressfrontTraceSample1` passes the instant live test
  (it answers for its invented name only).
