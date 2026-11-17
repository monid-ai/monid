# Proposal: add-connector-omneky

## Why

Omneky generates brand-aligned advertising creative. Its external API turns a
brand URL (plus optional product details, images, colors, fonts and copy) into
a finished image ad or a short product video ad. Adding it gives Monid agents
an ad-creative endpoint that needs no design input beyond a website, with no
new engine capability.

## What Changes

- Add the `omneky` provider with `X-API-Key` authentication, base URL
  `https://api.omneky.com/api/v1/external-api`, asynchronous job polling via
  `GET /jobs/{job_id}`, and one credit pool `default` for Omneky credits.
- Add `/v1/image-ad` (`POST /create_image_ad_async`): one image ad per call,
  priced by resolution from Omneky's published rate card — 5 Omneky credits
  at 1K, 10 at 4K (a COMPOSITE model with `image_1k` / `image_4k` lines).
- Add `/v1/video-ad` (`POST /create_video_ad_async`): one 10–15 second
  product video ad per call, 10 Omneky credits (the published "Product
  Animation Video with sound" rate).

## Pricing

Rates follow Omneky's published billing section
(https://www.omneky.com/api-docs#billing). Lines on that card with no
external-API endpoint (image edit/upscale, layering, short commercial,
avatar and long-form scripted video, scene regeneration, video clone and
edit, auto-splicing, AI creative performance insights, ad-account
connections) are listed in `provider.ts` for completeness and are not
exposed. The docs state no credit-to-currency rate.

## Capabilities

- `omneky-connector`.

## Non-goals

- `GET /jobs/{job_id}` as its own endpoint: jobs are private to the API key
  that created them, so on a shared platform key it is used only by the
  provider's poll, for the job the run itself submitted.
- `no_of_ads` batches (priced per ad), caller-supplied `job_ids`, and
  `callback_url` webhooks.
- Account, key-management, playground, usage and checkout routes.

## Impact

New connector tree only. No schema or engine changes.
