# scam-ai-connector (delta)

## ADDED Requirements

### Requirement: Scam.ai provider definition
The provider SHALL declare name `scam-ai`, `x-api-key` header authentication,
`https://api.scam.ai` as its base URL, and one credit pool named `default` for
Scam.ai credits. Successful responses SHALL settle from the provider's
`credits_used` field, lifted out of the payload as the usage claim. Error
responses SHALL surface nested `error.message` / `error.code` or flat
`message` / string `error` fields, with the raw body preserved.

#### Scenario: A completed run returns output and billed credits
- **WHEN** a detection answers 200 with a verdict envelope
- **THEN** the run completes with the envelope minus `credits_used`
- **AND** usage settles from `credits_used`

#### Scenario: An out-of-credits answer is not billed
- **WHEN** the provider answers 402 INSUFFICIENT_CREDITS
- **THEN** the run completes as a provider error with zero usage
- **AND** the output carries the provider's error code and message

### Requirement: Detect Media endpoint
The connector SHALL provide `/v1/detections` as a POST to `/v1/detections`.
Input SHALL require `url` as a public `https://` URL and SHALL reject
additional fields. The usage model SHALL be PER_UNIT over Scam.ai credits
(`CREDIT`, every 1, 1 credit per unit), the pre-run estimate SHALL be the
1-credit billable-image estimate, and the evidence SHALL read `credits_used` from the
response, failing the run when a success envelope lacks it.

The vendor input schema SHALL mirror HTTP/HTTPS URLs and optional boolean
`thumbnails`. The connector's HTTPS-only, URL-only restrictions SHALL be
derived from that schema at the endpoint binding.

#### Scenario: Score an image URL
- **WHEN** a caller submits `{url: "https://example.com/ai-portrait.png"}`
- **THEN** the wire request posts the body to `https://api.scam.ai/v1/detections`
- **AND** the estimated usage is 1 Scam.ai credit

#### Scenario: Settle a video run per scored frame
- **WHEN** a video run answers with `credits_used: 12`
- **THEN** usage settles at 12 Scam.ai credits
- **AND** evidence reports 12 credits
- **AND** output preserves the full response except for `credits_used`

#### Scenario: The compiled input gate preserves the connector's URL-only policy
- **WHEN** a caller submits an HTTP URL, or includes `thumbnails` or an unknown field
- **THEN** input validation rejects the request before transport
- **AND** changing only the HTTP URL's scheme to HTTPS passes the pure estimate

#### Scenario: A success envelope without the vendor meter fails
- **WHEN** a 200 response lacks `credits_used`
- **THEN** the run fails instead of settling a zero bill

#### Scenario: A link refusal preserves its flat error envelope
- **WHEN** the provider answers 422 with a string `error` and top-level `message`
- **THEN** the connector exposes that error code and message, preserves the raw body, and settles zero usage

#### Scenario: A recognised duplicate is free
- **WHEN** a success reports `credits_used: 0` and `zero_charge_reason: "duplicate"`
- **THEN** the run settles zero credits and preserves the zero-charge reason
