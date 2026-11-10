# creatify-connector (delta)

## ADDED Requirements

### Requirement: Creatify provider definition
The provider SHALL declare name `creatify`, a two-field credential
(`apiId`, `apiKey`) injected as the `X-API-ID` and `X-API-KEY` headers,
`https://api.creatify.ai` as its base URL, a provider-level asynchronous job
lifecycle (create, then poll the detail route derived from the compiled
request), and one credit pool named `default` for Creatify API credits.
Successful terminal responses SHALL settle from the job row's `credits_used`
field.

#### Scenario: A done job returns the video and the billed credits
- **WHEN** the create request returns a job id and polling reaches `done`
  with a `video_output` URL
- **THEN** the run completes with the job row
- **AND** usage settles from `credits_used`

#### Scenario: A failed or rejected job is not billed
- **WHEN** polling reaches `failed` or `rejected`
- **THEN** the run completes as a provider error (500 or 422 over the poll's
  200) with zero usage

#### Scenario: A refused creation is data
- **WHEN** the create request answers a non-2xx (validation, credits,
  access, rate limit)
- **THEN** the run completes as a provider error with zero usage and never
  polls

#### Scenario: Caller-side delivery
- **WHEN** the request carried `output_upload_url` and polling reaches
  `done` with `video_output` null
- **THEN** the run completes successfully and bills as usual

### Requirement: Boreal-H3 endpoint
The connector SHALL provide `/boreal-h3` as a POST to `/api/boreal/` with
`model` pinned to `boreal-h3` on the wire. Input SHALL require `prompt`,
accept `image_url`, `end_image_url`, `reference_image_urls` (≤9),
`reference_video_urls` (≤3), `reference_audio_urls` (≤3), `resolution`
(`768p` default, `1088p`, `2k`), `aspect_ratio` (`auto` default),
`duration` (whole seconds 1-15, default 10), `prompt_enhancement` (`auto`
default, `none`), `ttl_days` and `output_upload_url`, and reject unknown
fields. Usage SHALL be a composite of per-second lines per output tier
(0.13 / 0.27 / 0.53 credits), per-second reference-video lines per tier
(0.4 / 0.6 / 0.6) and reference images beyond the first five (0.2).

#### Scenario: Estimate a plain render
- **WHEN** a caller submits `{prompt, resolution: "2k", duration: 8}`
- **THEN** the estimate is 8 × 0.53 credits on `2k_second`

#### Scenario: Estimate a reference render
- **WHEN** the request carries one reference video and seven reference
  images at 2k for 8 seconds
- **THEN** the estimate holds 15 `2k_reference_second` and 2
  `reference_image` on top of the output seconds

### Requirement: Aurora endpoint
The connector SHALL provide `/aurora` as a POST to `/api/aurora/`. Input
SHALL require `audio` and `image`, accept `model_version` (`aurora_v1`
default, `aurora_v1_fast`), `prompt_guidance_scale` (0-10, default 1),
`name`, `text_prompt`, `ttl_days` and `output_upload_url`, and reject unknown
fields. Usage SHALL be one per-second line per tier (1 and 0.5 credits);
the estimate SHALL hold 300 seconds on the selected tier and the settle SHALL
count the job row's `duration`.

#### Scenario: Settle the audio's whole seconds
- **WHEN** a 12-second track renders on `aurora_v1`
- **THEN** usage settles 12 credits with evidence `aurora_v1_second: 12`

### Requirement: Aurora 2.0 endpoint
The connector SHALL provide `/aurora-2` as a POST to `/api/aurora/` with
`model_version` pinned to `aurora_v2` on the wire. Input SHALL require
`audio` and `image`, accept `resolution` (`480p`, `720p` default, `1080p`,
`2k`), `name`, `text_prompt`, `ttl_days` and `output_upload_url`, and reject
unknown fields. Usage SHALL be one per-second line per resolution (0.4 /
0.7 / 1.4 / 2.8 credits); the estimate SHALL hold 60 seconds (15 at 2k) on
the selected tier.

#### Scenario: Pin the version on the wire
- **WHEN** a caller submits `{audio, image}`
- **THEN** the wire body carries `model_version: "aurora_v2"` and
  `resolution: "720p"`
- **AND** the estimate is 60 × 0.7 credits
