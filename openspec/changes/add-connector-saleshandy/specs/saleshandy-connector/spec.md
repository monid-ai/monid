## ADDED Requirements

### Requirement: Search Saleshandy Lead Finder

The connector SHALL provide `saleshandy#search/people` and `saleshandy#search/companies` and authenticate with the Saleshandy `x-api-key` header.

#### Scenario: Search matches

- **WHEN** a caller submits documented Saleshandy search filters
- **THEN** the connector sends a POST to the corresponding Saleshandy search endpoint and returns the vendor's results and pagination metadata
- **AND** the search preview settles without consuming enrichment credits

#### Scenario: No matches

- **WHEN** Saleshandy returns an empty payload array
- **THEN** the connector preserves the vendor's empty payload
