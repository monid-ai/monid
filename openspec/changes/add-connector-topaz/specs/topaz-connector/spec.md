# topaz-connector (delta)

## ADDED Requirements

### Requirement: Twelve video endpoints over one express job
The connector SHALL expose twelve endpoints with pinned ids `topaz#video/*`,
each posting to `POST https://api.topazlabs.com/video/express` with exactly
one `filters[]` entry whose model belongs to that endpoint.

#### Scenario: The express body is assembled from the flat input
- **WHEN** `topaz#video/upscale` runs with a 640x360 30 fps source and a
  1280x720 output
- **THEN** the body carries `source.external.presignedUrl` = `video_url`,
  `filters: [{model: "prob-4"}]`, and an `output` with the 1280x720
  resolution, H264 High, mp4, AAC audio copy and
  `dynamicCompressionLevel: "High"`

#### Scenario: A model cannot be asked of the wrong endpoint
- **WHEN** a caller sends `model: "slp-2.6"` to `topaz#video/upscale`, or any
  `model` to a single-model endpoint
- **THEN** the run is rejected INVALID_INPUT before any upstream call

### Requirement: The source URL is a public https video link
`video_url` SHALL match `https://`, a public host, and a path ending in a supported video
extension, case-insensitively, with an optional query or fragment.

#### Scenario: Private and internal hosts are rejected
- **WHEN** `video_url` names `localhost`, a `*.internal` host, an IPv6
  literal, or a loopback, 0/8, private-range or link-local IPv4 address, in
  any numeric spelling, with a trailing dot, or through `\`, `%` or
  non-ASCII characters in the host
- **THEN** the run is rejected INVALID_INPUT

#### Scenario: Extension-less and plain-http URLs are rejected
- **WHEN** `video_url` is `http://…/x.mp4` or `https://…/AbC?e=1`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: Async job lifecycle with a real cancel
The provider SHALL implement `start` (express), `poll`
(`GET /video/{id}/status`, then `GET /video/{id}` on `complete`) and `stop`
(`DELETE /video/{id}`).

#### Scenario: A rejected express is data
- **WHEN** the express call returns 400
- **THEN** the run COMPLETES with httpStatus 400, the body as output, and
  zero usage

#### Scenario: A failed job settles as a provider error
- **WHEN** the status is `failed`, `canceled` or `canceling`
- **THEN** the run COMPLETES with a synthesized 500, `providerHttpStatus`
  200 and zero usage

#### Scenario: A complete job without a link is visible
- **WHEN** the record has no `destination.download.url`
- **THEN** the run COMPLETES with a synthesized 502 and zero usage

#### Scenario: A failing status read does not settle
- **WHEN** the status read returns 503
- **THEN** the poll throws and the run does not settle

#### Scenario: Stop cancels upstream
- **WHEN** the run is stopped and the cancel returns 2xx
- **THEN** the stop is STOPPED_UNSETTLED; any other answer is UNRESOLVED

### Requirement: Topaz credits, settled by the ledger
`usage.credits` SHALL declare one pool, `default`, in Topaz credits. The
estimate SHALL apply the endpoint's frames-per-credit rate for the chosen
model and output tier; the settled amount SHALL be the sum of the record's
`commit` ledger rows, claimed by `usage.consolidate`, falling back to
`estimates.cost[0]` when no commit row exists.

#### Scenario: The ledger settles the run and is stripped
- **WHEN** a job completes with a ledger committing 3 credits
- **THEN** usage is `{credits: {default: 3}, evidence: {CREDIT: 3}}` and the
  output carries no `transactions`, `userId`, `adminId`, `processing`,
  `overrides`, `version` or `lastEventTs`

#### Scenario: The 4K tier starts above 1920x1080 in either orientation
- **WHEN** `topaz#video/upscale` estimates 300 frames to 3840x2160
- **THEN** the hold is 6 credits; to 1080x1920 it is 3
