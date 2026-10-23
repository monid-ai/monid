# omneky-connector (delta)

## ADDED Requirements

### Requirement: Omneky provider definition
The provider SHALL declare name `omneky`, `X-API-Key` header authentication,
`https://api.omneky.com/api/v1/external-api` as its base URL, asynchronous
polling of `GET /api/v1/external-api/jobs/{job_id}`, and one credit pool
named `default` for Omneky credits.

#### Scenario: A job that succeeds returns the finished job
- **WHEN** the create request returns `202` with a `job_id` and polling
  reaches `SUCCESS`
- **THEN** the run completes with the job-status body, including `result_url`
- **AND** usage settles at the endpoint's flat credit rate

#### Scenario: A failed job is not billed
- **WHEN** polling reaches `FAILED`
- **THEN** the run completes as a provider error with zero usage

#### Scenario: A rejected submission is not polled or billed
- **WHEN** the create request answers non-2xx (401, 402, 422, 429)
- **THEN** the run completes with that status and zero usage

### Requirement: Image ad endpoint
The connector SHALL provide `/v1/image-ad` as a POST to
`/create_image_ad_async`. Input SHALL require `brand_metadata`, require
`product_images` whenever `product_metadata` is present, accept `"1K"` or
`"4K"` as `generation_metadata.resolution` (default `"1K"`), and reject
`no_of_ads`, `job_ids` and `callback_url`. The usage model SHALL be
COMPOSITE: one `image_1k` result at 5 Omneky credits, or one `image_4k`
result at 10, selected by the request's resolution.

#### Scenario: Resolution selects the rate
- **WHEN** a caller requests `generation_metadata.resolution: "4K"`
- **THEN** the estimate and the success settle are one `image_4k` (10 credits)
- **AND** an omitted resolution goes on the wire as `"1K"` and bills 5

### Requirement: Video ad endpoint
The connector SHALL provide `/v1/video-ad` as a POST to
`/create_video_ad_async`. Input SHALL require `brand_metadata`,
`product_metadata` with at least one `product_images` URL, and
`generation_metadata.target_duration` between 10 and 15, and reject
`callback_url`. The usage model SHALL be 10 Omneky credits per call.
