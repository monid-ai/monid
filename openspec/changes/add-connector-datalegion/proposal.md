# Proposal: add-connector-datalegion

## Why

Data Legion is live in the hosted Monid catalog (6 endpoints) but absent
here: person and company enrichment from identifiers, packaged as Data
Legion's own product tiers — person Base or Premium, each with or without
the contact and demographic (PII) field group, and company Base or Premium.
The API is public and documented (docs/api-reference/openapi.json), so it
ports with no contract change.

## What Changes

- **connectors/datalegion** — base `https://api.datalegion.ai`, `API-Key`
  header auth, 30 s request and run budgets.
- **Usage in Data Legion credits.** "1 credit = 1 record returned", and a
  lookup with no match costs nothing (datalegion.ai/pricing). Person and
  company records draw separate credit types, so the provider declares two
  pools, `person` and `company`. Every product is `PER_UNIT` `RESULT` at 1
  credit; evidence is the length of the response's `matches`; the estimate
  is 1 (single-result calls). No dollar amounts are pinned.
- **Six endpoints, two vendor routes.** The vendor has no tier parameter;
  each product is the same route with a field filter:

  | id | route | request filter | response filter |
  |---|---|---|---|
  | `person/enrich/base/no-pii` | `POST /person/enrich` | PII + Premium top-level fields | PII + Premium, incl. nested Premium subfields |
  | `person/enrich/base/pii` | `POST /person/enrich` | Premium top-level fields | Premium, incl. nested |
  | `person/enrich/premium/no-pii` | `POST /person/enrich` | PII top-level fields | PII |
  | `person/enrich/premium/pii` | `POST /person/enrich` | — | — |
  | `company/enrich/base` | `POST /company/enrich` | Premium top-level fields | Premium, incl. nested |
  | `company/enrich/premium` | `POST /company/enrich` | — | — |

  - Field lists come from Data Legion's tier docs (`person-data/tiers`,
    `company-data/tiers`). PII = `sex`, `birth_*`, `age`, `work_email`,
    `mobile_phone`, `phones`, `emails`, `city`, `state`, `state_code`,
    `country`, `country_code`, `locations`.
  - `toRequest` appends the product's top-level exclusions to the caller's
    `exclude_fields` (the vendor applies it after `include_fields`), so a
    no-PII product never receives contact data. `fromResponse` drops the
    same fields again plus NESTED Premium subfields (e.g.
    `emails[].confidence`, `experience[].title.raw`), which the docs only
    show a top-level filter for.

## Non-goals

- `multiple_results` / `limit` (enterprise-only per account; every extra
  match bills), `pretty_print`, and the search, discover, and utility
  routes.

## Impact

- Fixtures are SYNTHETIC: one person and one company match carrying every
  field group, plus the documented 404 no-match.
