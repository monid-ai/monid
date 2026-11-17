# citable-connector (delta)

## ADDED Requirements

### Requirement: Citable provider definition
The provider SHALL declare name `citable`, base URL `https://citable.flisk.si`,
an empty credentials shape with a pass-through `auth.inject`, and no credit
system. No credential SHALL be required to run any endpoint.

#### Scenario: A run needs no credential
- **WHEN** an endpoint runs with no `CITABLE_*` variable set
- **THEN** the request leaves unchanged and the run completes

### Requirement: Check endpoint
The connector SHALL provide `/api/check` as a GET to `/api/check`. Input SHALL
require `url` (a non-empty string) in `queryParams`, accept `fresh` only as
`"1"`, and reject any other key. The usage model SHALL be FREE.

#### Scenario: Check a page
- **WHEN** a caller submits `{queryParams: {url: "example.com"}}`
- **THEN** the run returns the service's report unchanged with zero usage

#### Scenario: A refused address is data
- **WHEN** the service answers 400 for a non-public address
- **THEN** the run completes as a provider error with zero usage and the body untouched
