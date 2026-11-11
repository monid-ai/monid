# readme-score-connector (delta)

## ADDED Requirements

### Requirement: README Score provider definition
The provider SHALL declare name `readme-score`, base URL
`https://readme.flisk.si`, an empty credentials shape with a pass-through
`auth.inject`, and no credit system. No credential SHALL be required to run
any endpoint.

#### Scenario: A run needs no credential
- **WHEN** an endpoint runs with no `README_SCORE_*` variable set
- **THEN** the request leaves unchanged and the run completes

### Requirement: Score a repository endpoint
The connector SHALL provide `/api/score` as a GET to `/api/score`. Input SHALL
require `repo` (a non-empty string) in `queryParams`, accept `type` only as
`cli`, `library`, `app` or `api`, and reject any other key. The usage model
SHALL be FREE.

#### Scenario: Score a public repository
- **WHEN** a caller submits `{queryParams: {repo: "flisk-sh/readme-score"}}`
- **THEN** the run returns the service's report unchanged with zero usage

#### Scenario: An unknown repository is data
- **WHEN** the service answers 404 for a repository that is not public
- **THEN** the run completes as a provider error with zero usage and the body untouched

### Requirement: Score Markdown endpoint
The connector SHALL provide `/api/score/markdown` as a POST to `/api/score`.
Input SHALL require `readme` (a non-empty string) in `body`, accept `type` as
above and `website` as a non-empty string, and reject any other key. The usage
model SHALL be FREE.

#### Scenario: Score pasted Markdown
- **WHEN** a caller submits `{body: {readme: "# slugkit\n\nTurn titles into slugs.\n", type: "library"}}`
- **THEN** the run returns the service's report unchanged with zero usage
