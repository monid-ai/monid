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
The same goes for a story going around ("Lara went partying after the concert
was cancelled") or the situation in the caller's own words: the earliest
public post Pressfront can find, how it spread, who carried it, and whether it
came round before, as a four-stop answer card. It reports what people posted;
it never decides who is right or whether a story is true.

Its API is a clean fit for the connector standard: one base URL, bearer auth,
flat US-dollar prices per call, `{error, message}` errors, and a job protocol
for the one slow operation. Nothing about it needs a new engine capability.

## What Changes

- **connectors/pressfront**: 5 endpoints against
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
  - `POST /understand` (sync, PER_CALL $0.05): the situation in the caller's
    own words (`text`, optional base64 `files`) in, `{understood}` out (a
    name or a story, the query a trace would run, the "Looking into" lines).
    Starts and stores nothing. Only the 200 bills; a 422 `unclear` is
    zero-billed.
  - `POST /traces` (async, PER_CALL $4.99): a fresh trace, about 4 to 7
    minutes, from exactly one of `{name}`, `{claim}` (a story: a rumor trace)
    or `{text, files?}` (understood first). `lifecycle.start` submits;
    `lifecycle.poll` long-polls `GET /traces/{id}?wait=20` and, on done,
    reads the case card, the story (name traces only: a story trace answers
    422 there, so it settles as null) and the brief, and settles them with
    the job `id`. A failed trace settles as a synthesized 500 (zero-billed).
    No cancel exists, so no `stop`.
  - `GET /traces/{id}` (FREE): the status read the poll makes, exposed.
  - `GET /traces/{id}/{part}` (PER_CALL $0.05): one part of a finished
    trace (case, brief, story, accounts, posts, timeline, groups, who,
    sites, evidence), with the accounts / posts filters and paging. A story
    trace has case and brief.
- **Fixtures**: `instant-ok`, `instant-none`, `trace-read-accounts` and
  `trace-status-done` are real recordings made with Pressfront's public demo
  key, whose one trace is INVENTED (no real person appears anywhere).
  `synthetic-trace-done` / `synthetic-trace-failed` are synthetic chains in
  the real shapes, because the demo key cannot start traces; their story,
  brief and done status bodies are real demo recordings. The case card,
  `understand` and story-trace fixtures (`case-target`, `case-rumor`,
  `understand-ok`, `understand-unclear`, `synthetic-trace-rumor-done`) were
  built by running Pressfront's own API code (its case-card and understand
  modules, the model reply stubbed) on invented fixtures before those routes
  were deployed; `case-target` should be re-recorded with the demo key once
  `/case` is live.
- **ids.lock.json** gains the five endpoint ids.

## Impact

- Connector-only change: no engine, schema or compiler change, no version
  bump.
- Live tests run with `PRESSFRONT_API_KEY`; the public demo key
  `pf_live_DemoKeyForPressfrontTraceSample1` passes the instant live test
  (it answers for its invented name only).
