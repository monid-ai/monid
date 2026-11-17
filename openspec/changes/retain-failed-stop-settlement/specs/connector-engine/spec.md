# connector-engine delta

## ADDED Requirements

### Requirement: Failed stop settlement needs reconciliation
A failed settlement of a COMPLETED stop outcome SHALL return UNRESOLVED with the previous state, regardless of estimate cadence. A successful settlement SHALL remain COMPLETED.

#### Scenario: Failure is contained
- **WHEN** output validation fails while settling completed stop
- **THEN** the host receives UNRESOLVED and the last known run state
