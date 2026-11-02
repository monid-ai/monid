# Proposal: add-fuse-lookups-and-company-people

## Why

Fuse adds four Data API routes that close gaps in the outbound path the
connector already walks:

- **Reverse lookups.** An agent often starts from a contact detail, an
  inbound email or a number from a call log, and needs the person behind it.
  Fuse now answers who an email address or a phone number belongs to,
  charged only when someone is found.
- **A company's people.** "Who are the decision makers at this account" took
  a company resolve plus a people search with the right employer filter. One
  route now does both: it resolves the company and pages its people, narrowed
  by seniority, department or title.
- **A free contact check.** Before paying for a lookup, an agent can ask
  whether Fuse already holds an email or a phone for a person, without the
  value: a known one is what the lookups answer at once.

## What Changes

- **connectors/fuse**: 4 sync endpoints, 15 in all.
  - `data/people/reverse-email` and `data/people/reverse-phone`:
    receipt-settled `PER_UNIT` in `CREDIT` units, like the lookups. A number
    Fuse cannot read answers 422 `PHONE_NUMBER_INVALID`, charged nothing.
  - `data/people/contact-status`: `FREE`. It takes a `linkedinUrl`, or a
    `name` with a `companyDomain`, and no `companyName`, as Fuse does: turning
    a name into a domain asks a provider, and the check asks none.
  - `data/companies/people`: receipt-settled `PER_UNIT` in `CREDIT` units,
    unlike the two searches, because Fuse answers `creditsCharged`, the plan
    price times the people returned. Paged by the opaque `scrollToken`, sent
    back with the same `company` and `filters`; `size` is 1 to 25, default
    10. Its `filters` are the people search vocabulary without the four
    company fields Fuse refuses here.
- **Rates live only in the estimates**, from the entries Fuse sets on the
  platform key's usage plan for these routes: 1 per person found by email, 2
  per person found by phone, 1 per person returned by a company's people
  list. The contact check is free.
- **Nothing to drop from rows.** Fuse answers these people as profiles only,
  with no workspace fields and no contact details, so no `fromResponse` is
  needed.
- The provider doc and catalog text name the new surfaces.
- 8 synthetic fixture chains and 18 replay tests, plus a gated live test per
  endpoint. Each live test is built on a placeholder that names nobody (an
  `example.com` address, a `.example` domain, a 555-01xx number), so a live
  run charges nothing.

## Capabilities

- `fuse-connector` (delta).

## Non-goals

- **Recorded fixtures wait for the routes.** They are new on Fuse's side;
  the chains stay `synthetic-` until the routes answer on production and are
  recorded.
- No change to the 11 existing endpoints, the provider hooks or the engine.

## Impact

`connectors/ids.lock.json` gains the 4 ids, and only those: the lock's
existing drift in other providers is left as it is. No new `Unit`, preset,
hook, category or compiler change, and no engine bump. The routes answer only
for a key whose Fuse usage plan lists them; any other key gets
`403 API_NOT_ON_PLAN`. Builds on `add-connector-fuse`.
