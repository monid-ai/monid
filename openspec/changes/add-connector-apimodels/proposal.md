# Proposal: add-connector-apimodels

## Why

apimodels (apimodels.app) serves image and video generation models behind
one API key and one task contract. Adding it gives Monid agents GPT Image 2,
Nano Banana 2.1, Nano Banana Pro, Veo 3.1 Fast and Seedance 2.0 through a
provider that retries failed upstream calls, moves tasks to another channel
for the same model where one exists, and reports the exact dollar amount
charged on every completed task. No new engine capability is needed.

## What Changes

- Add the `apimodels` provider: Bearer authentication, asynchronous task
  creation and polling on the path the task was created on, settlement from
  the completed task's `credits` (USD) receipt, and an output that drops the
  account id and the JSON-string echoes.
- Add three image endpoints (`v1/image/gpt-image-2`,
  `v1/image/nano-banana-2-1`, `v1/image/gemini-3-pro-image`), each priced per
  image by output tier.
- Add three video endpoints (`v1/video/veo-3.1-fast-hd`,
  `v1/video/veo-3.1-fast-fhd` at a flat price per 8-second clip,
  `v1/video/seedance-2.0` priced per second by resolution).

## Capabilities

- `apimodels-connector`.

## Non-goals

- apimodels' speech, music, transcription and language-model endpoints.
- Webhook delivery (`callback_url`); the connector polls.
- Inline base64 media and asset-library references.

## Impact

New connector tree plus six lines in `connectors/ids.lock.json`. No schema
or engine changes.
