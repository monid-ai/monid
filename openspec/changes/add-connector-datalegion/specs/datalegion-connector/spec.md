# datalegion-connector (delta)

## ADDED Requirements

### Requirement: Credits per returned record
The provider SHALL declare two credit pools, `person` and `company`. Each
person product SHALL price `PER_UNIT` `RESULT` at 1 `person` credit and
each company product at 1 `company` credit, with evidence equal to the
length of the response's `matches` and an estimate of 1.

#### Scenario: One match
- **WHEN** a person product returns one match
- **THEN** usage is `{credits: {person: 1}, evidence: {RESULT: 1}}`

#### Scenario: No match
- **WHEN** the vendor answers 404
- **THEN** `isProviderError` is true and usage is `{credits: {}, evidence: {}}`

### Requirement: Products are field filters
Each product SHALL append its excluded top-level fields to the caller's
`exclude_fields`, keeping the caller's entries first and adding no
duplicates, and SHALL drop its excluded fields from every returned match,
including nested Premium subfields. `person/enrich/premium/pii` and
`company/enrich/premium` SHALL add no filter.

#### Scenario: Base without PII
- **WHEN** `person/enrich/base/no-pii` returns a match carrying PII and
  Premium fields
- **THEN** the output has none of them, nested Premium subfields included,
  and keeps every Base field

#### Scenario: Caller filter merge
- **WHEN** the caller sends `exclude_fields: "education,sex"` to
  `person/enrich/premium/no-pii`
- **THEN** the wire `exclude_fields` starts `education,sex`, adds the other
  PII fields once each, and names no Premium field
