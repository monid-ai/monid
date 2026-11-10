# Tasks: add-connector-scam-ai

## 1. Connector

- [x] 1.1 Add provider metadata, `x-api-key` auth, credit settlement from `credits_used`, and the error digest
- [x] 1.2 Add the detect-media endpoint and its strict public-URL input schema
- [x] 1.3 Register the `ai-detection` leaf category

## 2. Specification and verification

- [x] 2.1 Add the OpenSpec proposal and connector requirements
- [x] 2.2 Add synthetic fixtures and replay tests (happy image, happy video, missing-meter, 402, input gate)
- [x] 2.3 Run formatting, type checks, tests, and the id-lock update
- [x] 2.4 Record real image/video responses with a detection-scoped key and add replay coverage for the recorded payloads and credit settlement
- [x] 2.5 Align the supported-media descriptions and docs link with the current public detection route
- [x] 2.6 Preserve flat link/scope errors and verify zero-charge success settlement through the compiled connector
- [x] 2.7 Describe scored-frame billing and billable-image estimates; remove unsupported calibration/compliance claims and document-input wording
- [x] 2.8 Mirror vendor inputs and derive connector restrictions at the binding; verify the compiled HTTPS near-twin and thumbnail rejection
- [x] 2.9 Assert the complete synthetic video output and cite the checked credit-rate source beside provider metadata and test assertions
