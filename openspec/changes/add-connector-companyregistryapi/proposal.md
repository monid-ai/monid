# Proposal: add-connector-companyregistryapi

## Why

Agents asked about a company usually start from a name and need to know
whether that company exists in an official register, what it is called
there, what its registry numbers are, and whether it is still active. The
catalog's company leaves today are enrichment and firmographics; none of
them answers "which registered legal entity is this, according to the
register".

CompanyRegistryAPI.com is that lookup, powered by Coragrid: one search over
official company registers by the start of a name or a business ID, and one
read of a company's registry profile by a permanent ID that survives name
changes and renumbering. It is free and keyless.

Mechanically it is the smallest possible fit: one base URL, no credentials,
two synchronous GET endpoints, and no billing meter. Nothing here needs a new
engine capability.

## What Changes

- **connectors/companyregistryapi**: 2 sync GET endpoints against
  `https://api.companyregistryapi.com`, as published in
  https://companyregistryapi.com/api/openapi.json:
  - `companyregistryapi#v1/search` — search by the start of a company name
    or a business ID, optionally by address country or registration
    jurisdiction, cursor-paged.
  - `companyregistryapi#v1/companies/{company_id}` — one company's registry
    profile by its permanent Coragrid ID.
- **Keyless.** The provider declares an empty credential shape and an
  `auth.inject` that returns the request unchanged; no credential is read or
  sent.
- **FREE on the provider**, inherited by both endpoints. No vendor meter, so
  no `usage.consolidate` and no quantities fns.
- **Faithful mirrors, no wire layer.** Each `schema/inputs.ts` mirrors its
  published OpenAPI parameters (bounds and patterns included), optionality
  only, no `.default()`. No endpoint declares `input.toRequest` or
  `output.fromResponse`: the validated input IS the wire request and the
  vendor body IS the output, `attribution` field included.
- **Strict inputs.** The mirrors are `z.strictObject`, so an unknown
  parameter (`country` for `address_country`, say) is `INVALID_INPUT`
  instead of being silently ignored by the API and returning an unfiltered
  search.
- Real recorded fixtures for both endpoints (happy, empty, expired cursor,
  not found) plus one synthetic 429 taken from the published OpenAPI
  example.

## Capabilities

- `companyregistryapi-connector`.

## Non-goals

- `GET /v1/companies/{company_id}/officers` is published but not ported in
  this change.
- No paid tier or credentialed variant.

## Impact

New connector tree plus two `connectors/ids.lock.json` entries. Uses the
existing `company-enrichment` and `government-data` leaves. No new `Unit`,
preset, hook, compiler or engine change; `deno task version:check` is clean.

## Questions for hosted admission

- Can hosted provider configuration accept the empty credential shape and
  FREE usage without an account pool?
- The free API allows 60 requests per minute per client address. Hosted
  calls from shared egress addresses share that allowance; a per-caller
  allowance needs a stable caller identifier from Monid, to be agreed with
  the vendor.
