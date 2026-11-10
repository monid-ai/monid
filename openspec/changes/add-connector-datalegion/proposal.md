# Proposal: add-connector-datalegion

## Why

Data Legion is live in the hosted Monid catalog (monid-services
`adaptors/datalegion`, 6 endpoints, prod `include: true`) but absent here:
person and company enrichment from identifiers, sold as six products —
person Base or Premium, each with or without the contact and demographic
(PII) field group, and company Base or Premium. The API is public and
documented (docs/api-reference/openapi.json), so it ports with no contract
change.

## What Changes

- **connectors/datalegion**: base `https://api.datalegion.ai`, 30 s
  request and run budgets (v1 config).
- **Six keys, one per product (design D1).** The key selects the product;
  no field filter emulates a tier. One credential object holds all six
  keys; each endpoint injects its own into `API-Key`.
- **Six pools, 1 credit per successful call (design D2).** One pool per
  key; v1's per-product rates go on the broker card. A no-match is a free
  404.
- **Six endpoints, two vendor routes:**

  | id | route | key / pool |
  |---|---|---|
  | `person/enrich/base/no-pii` | `POST /person/enrich` | `personBaseNoPiiApiKey` / `person_base_no_pii` |
  | `person/enrich/base/pii` | `POST /person/enrich` | `personBasePiiApiKey` / `person_base_pii` |
  | `person/enrich/premium/no-pii` | `POST /person/enrich` | `personPremiumNoPiiApiKey` / `person_premium_no_pii` |
  | `person/enrich/premium/pii` | `POST /person/enrich` | `personPremiumPiiApiKey` / `person_premium_pii` |
  | `company/enrich/base` | `POST /company/enrich` | `companyBaseApiKey` / `company_base` |
  | `company/enrich/premium` | `POST /company/enrich` | `companyPremiumApiKey` / `company_premium` |

- The vendor body rides out unchanged (design D3). A company call needs one
  identifier (union); the person identifier rule is a note (design D4).

## Non-goals

- `multiple_results` / `limit` (every extra match bills), `pretty_print`,
  and the search, discover, and utility routes: none is in v1.

## Impact

- Fixtures are SYNTHETIC (no Data Legion key held at port time), in the
  vendor's OpenAPI shape: one match per product plus the documented 404.
- Hosted rollout needs the six keys under the credential fields above and
  the six pool rates on the broker card.
