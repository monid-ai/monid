# readme-diagram-connector (delta)

## ADDED Requirements

### Requirement: README Diagram provider definition
The provider SHALL declare name `readme-diagram`, base URL
`https://diagram.flisk.si`, an empty credentials shape with a pass-through
`auth.inject`, and no credit system. No credential SHALL be required to run
any endpoint.

#### Scenario: A run needs no credential
- **WHEN** an endpoint runs with no `README_DIAGRAM_*` variable set
- **THEN** the request leaves unchanged and the run completes

### Requirement: Diagram endpoint
The connector SHALL provide `/diagram` as a GET to `/{owner}/{repo}.svg`. Input
SHALL require `owner` and `repo` (non-empty strings) in `pathParams` and reject
any other key. The usage model SHALL be FREE.

#### Scenario: Diagram a public repository
- **WHEN** a caller submits `{pathParams: {owner: "flisk-sh", repo: "pages"}}`
- **THEN** the run returns the SVG markup as a string with zero usage

#### Scenario: An unknown repository is data
- **WHEN** the service answers 404 for a repository that is not public
- **THEN** the run completes as a provider error with zero usage and the plain-text body `not-found` untouched
