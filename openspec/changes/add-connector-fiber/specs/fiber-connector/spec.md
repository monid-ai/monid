# fiber-connector (delta)

## ADDED Requirements

### Requirement: Six endpoints, one key, one pool
The provider SHALL declare `https://api.fiber.ai/v1`, the `x-api-key`
header, and one pool of Fiber credits. Every endpoint SHALL be a
synchronous POST, and its id SHALL be its Fiber path.

#### Scenario: The bundle compiles
- **WHEN** the bundle compiles
- **THEN** it carries `fiber#linkedin-live-fetch/profile/single`,
  `fiber#linkedin-live-fetch/company/single`,
  `fiber#email-to-person/single`, `fiber#contact-details/lite`,
  `fiber#kitchen-sink/person`, and `fiber#kitchen-sink/company`, sharing
  one auth fn, one consolidate fn, and one fromError fn

### Requirement: The vendor's receipt is the claim and never reaches the caller
The provider `consolidate` SHALL pluck `$.chargeInfo` out of every 2xx
payload and claim `chargeInfo.creditsCharged` as the `default` pool. The
caller's output SHALL NOT carry `chargeInfo` or its `lowCreditAlert`.

#### Scenario: A live profile fetch
- **WHEN** the profile fetch answers 200 with `chargeInfo.creditsCharged: 2`
- **THEN** `usage` is `{credits: {default: 2}, evidence: {CALL: 1}}`
  and the output has no `chargeInfo`

#### Scenario: The claim disagrees with the card
- **WHEN** a lite reveal finds two email types and a phone, but the
  receipt says 3 credits
- **THEN** `usage.credits` is `{default: 3}` (the claim wins) and
  `usage.mismatch.derived` is `{default: 4}`

### Requirement: Each paid line bills what was delivered
- `email-to-person/single` SHALL count 1 when `output.data` is non-empty
  and 0 otherwise.
- `contact-details/lite` SHALL count `email` as Fiber delivers it: 0
  with no email, 2 when both types were requested and found, otherwise
  1. It SHALL count `phone` as 1 when phones were requested and a
  non-empty number came back.
- `kitchen-sink/company` SHALL count the companies in `output.data`.
- `kitchen-sink/person` SHALL count `lookup` as the people in
  `output.data`, and `live_fetch` as the same number when `liveFetch`
  is set.

#### Scenario: Every type requested and found
- **WHEN** the lite reveal asks for work, personal, and phone, and all
  three come back
- **THEN** `usage` is `{credits: {default: 4}, evidence: {email: 2, phone: 1}}`

#### Scenario: A miss is free
- **WHEN** a reverse email lookup answers 200 with an empty `data`
- **THEN** `usage` is `{credits: {}, evidence: {RESULT: 0}}`

### Requirement: Estimates hold Fiber's own upfront ceiling
Estimates SHALL read the materialized defaults:
- lite `email` is the number of requested email types and `phone` is 1
  when phones were requested.
- kitchen-sink company holds `numCompanies`.
- kitchen-sink person holds `numProfiles` lookups, plus as many live
  fetches when `liveFetch` is set.

#### Scenario: Default lite reveal
- **WHEN** a lite reveal names only a LinkedIn identifier
- **THEN** the estimate is `{credits: {default: 1}, evidence: {email: 1, phone: 0}}`

### Requirement: Vendor errors are data
A non-2xx Fiber response SHALL settle as a provider error with zero usage
and `{message, error?, raw}`. This covers 401 (bad key), 402 / 403 (out
of credits), 404 (live fetch of a missing profile or company), 410
(opted out), and 429 (rate limit).

#### Scenario: An opted-out email
- **WHEN** a reverse email lookup answers 410 `{message}`
- **THEN** `isProviderError` is true and `usage` is `{credits: {}, evidence: {}}`
