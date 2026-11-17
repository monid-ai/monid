# connector-engine delta

## ADDED Requirements

### Requirement: Best-effort cleanup after orchestration failure
After a RUNNING result, run SHALL attempt stop using the last known state and the same run handle when sleep or poll throws, then rethrow the original error.

#### Scenario: Poll transport failure
- **WHEN** a submitted job cannot be polled
- **THEN** stop is attempted once and the poll error is preserved

#### Scenario: Interrupted sleep
- **WHEN** sleep rejects between ticks
- **THEN** stop is attempted and the sleep error is preserved even if cleanup fails
