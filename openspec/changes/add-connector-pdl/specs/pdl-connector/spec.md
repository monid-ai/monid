# pdl-connector (delta)

## ADDED Requirements

### Requirement: PDL provider definition
The pdl provider SHALL declare name `pdl`, `request.baseUrl`
`https://api.peopledatalabs.com`, auth `presets.auth.header("X-Api-Key")`,
timeouts 60 s / 60 s, one credit pool `default`, NO `usage.consolidate` (the vendor meter lives only in
response headers), and a provider-level `usage.evidence` that counts
`data[]` for PER_UNIT docs and nothing for flat docs.

#### Scenario: Search bills per record from the derived fold
- **WHEN** `POST /v5/person/search` with `size: 3` returns 3 records
- **THEN** usage is `{credits: {default: 3}, evidence: {RESULT: 3}}`

#### Scenario: Enrichment bills one credit per match
- **WHEN** `GET /v5/company/enrich?website=stripe.com` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** a 404 no-match is a provider error with zero usage

### Requirement: Four endpoints, one pool
The connector SHALL provide `GET /v5/person/enrich`, `POST
/v5/person/search`, `GET /v5/company/enrich`, `POST /v5/company/search`;
every doc SHALL drain the provider's single `default` pool ("PDL
credits") at 1 credit per record or match; search `size` SHALL be required (1–100); a search body
carrying both `query` and `sql`, or neither, SHALL fail INVALID_INPUT.
