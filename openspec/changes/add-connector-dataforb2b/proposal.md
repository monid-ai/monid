# Proposal: add-connector-dataforb2b

## Why

DataForB2B answers the list-building half of a B2B job: find the people or
companies that match structured criteria, then turn a match into a contact.
Its people search filters on current AND past employment, title, skills,
education, languages, certifications and the current employer's funding
stage and investors; its company search filters on industry, size, headcount
growth, headquarters and office locations, and funding. Enrichment then
returns the full work history plus a work email, a personal email and a
phone, each charged only when found.

It fits the connector standard without stretching it: one base URL, one
header key, three synchronous JSON routes, and a per-response receipt
(`credits_used`) on every success.

## What Changes

- **connectors/dataforb2b** — 3 synchronous endpoints against
  `https://api.dataforb2b.ai`, auth header `api_key`, one credit pool, a
  provider-level `output.fromError` over FastAPI's `{detail}` envelope, and
  a provider-level `usage.consolidate`.
  - `search/people` and `search/companies` — the shared filter grammar
    (`connectors/dataforb2b/schema/filters.ts`): an `{op, conditions}` group
    of `{column, type, value, value2?}` leaves and one level of nested
    groups. `count` is REQUIRED at the binding (it is the estimate's basis);
    `enrich_live` carries each route's verified server default (true for
    people, false for companies).
  - `enrich/profile` — one arm per `enrich_*` flag, so the vendor's "at
    least one flag is true" rule is enforced at the gate instead of costing
    a 422 round trip.
- **The published card is the model, the receipt bills.** Searches are a
  `COMPOSITE` of `live_result` (1.5) and `indexed_result` (0.75), each
  `PER_UNIT` in `RESULT`s, counted on the line the request's `enrich_live`
  selects. Enrichment is a `COMPOSITE` of `profile` (1.5), `work_email` (1),
  `personal_email` (3) and `phone` (10), each counted only when the response
  carries it non-null; GitHub data is free and implies the profile. The
  provider consolidate claims `credits_used` and plucks it out of the output
  (D27): accounts on an earlier, lower card bill their own receipt and
  report `usage.mismatch.derived`.
- 6 provider-level fixture chains recorded live and hand-minimized (person
  identities replaced, contact values set to placeholders; two bound to
  `{{request.url}}`), 13 replay tests, and 3 live tests gated on
  `DATAFORB2B_API_KEY`, green against the live API.

## Capabilities

- `dataforb2b-connector`.

## Non-goals

- The remaining DataForB2B routes (company enrichment, post and job search,
  typeahead, natural-language search) arrive in follow-up changes.
- Batch enrichment (a comma-separated `profile_identifier`) is not
  described; the endpoint documents one person per call.
- No new category leaf: `people-enrichment` and `company-enrichment` exist.

## Impact

New connector tree plus three ids in `connectors/ids.lock.json`. No new
`Unit`, preset, hook, category or compiler change, and no engine bump.
Note for the fixture diet: the recorder's PII scrub let a US phone number
in the `(206) 555-0100` form through; the committed chains were scrubbed by
hand.
