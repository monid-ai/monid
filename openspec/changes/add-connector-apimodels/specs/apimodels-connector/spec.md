# apimodels-connector (delta)

## ADDED Requirements

### Requirement: apimodels provider definition
The provider SHALL declare name `apimodels`, Bearer authentication,
`https://api.apimodels.app` as its base URL, asynchronous task polling with
`GET <create path>?task_id=<taskId>`, and one credit pool named `default` for
US dollars. Successful terminal responses SHALL settle from the task's
`credits` field when it is a positive amount with `currency: "USD"`.

#### Scenario: A completed task returns its result and the amount charged
- **WHEN** the create request returns a `taskId` and polling reaches `completed` with at least one `resultUrls` entry
- **THEN** the run completes with the task, minus `credits`, `currency`, `userId`, `param`, `resultJson`, `modelDisplayName` and `modelType`
- **AND** usage settles from `credits`

#### Scenario: A failed task is not billed
- **WHEN** polling reaches `failed`
- **THEN** the run completes as a provider error with zero usage
- **AND** the status is 422 for `CONTENT_MODERATION`, 400 for `INVALID_INPUT`, 402 for insufficient balance, and 500 otherwise

#### Scenario: A failing poll does not abandon the task
- **WHEN** the task query answers a non-2xx status
- **THEN** the poll throws a retriable error instead of settling

### Requirement: Image endpoints
The connector SHALL provide `v1/image/gpt-image-2`,
`v1/image/nano-banana-2-1` and `v1/image/gemini-3-pro-image` as POSTs to
`/v1/images/generations`, each pinning its model, sending `async: true`, and
defaulting `resolution` to `1K`. Each SHALL bill per delivered image at its
list rate for the requested tier.

#### Scenario: Generate a 1K image
- **WHEN** a caller submits `{prompt: "a cat"}` to `v1/image/nano-banana-2-1`
- **THEN** the wire body is `{prompt: "a cat", resolution: "1K", model: "nano-banana-2-1", async: true}`
- **AND** the estimate is $0.022

### Requirement: Video endpoints
The connector SHALL provide `v1/video/veo-3.1-fast-hd` and
`v1/video/veo-3.1-fast-fhd` (flat $0.08 and $0.088 per 8-second clip) and
`v1/video/seedance-2.0` (per second by resolution, defaulting to 720p and
8 seconds) as POSTs to `/v1/video/generations`, each pinning its model.

#### Scenario: Estimate a default Seedance 2.0 clip
- **WHEN** a caller submits `{prompt: "a cat"}` to `v1/video/seedance-2.0`
- **THEN** the wire body states `resolution: "720p"` and `duration: 8`
- **AND** the estimate is 8 seconds at $0.197 per second
