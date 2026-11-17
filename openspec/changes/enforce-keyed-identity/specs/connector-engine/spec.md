# connector-engine delta

## ADDED Requirements

### Requirement: Exact keyed ownership identity
Keyed ownership gates SHALL require a row whose resource and externalId both equal the target. A nonmatching result SHALL produce the existing uniform 404 before upstream IO.

#### Scenario: Failure is contained
- **WHEN** the reader returns only unrelated rows
- **THEN** the gate returns 404 without upstream IO
