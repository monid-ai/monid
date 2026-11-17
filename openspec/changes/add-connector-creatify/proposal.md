# Proposal: add-connector-creatify

## Why

Creatify (creatify.ai) makes video models for advertising and sells them as a
public API. Two of them fill gaps in the catalog: **Aurora** turns one
portrait image and one speech track into a lip-synced talking-avatar video —
the catalog has no avatar or lip-sync endpoint today — and **Boreal-H3**
renders 1-15 second ad clips with native audio from a prompt, a first/last
frame, or reference images, video and audio, at about half the per-second
price of the MiniMax H3 tiers already listed. The API is one host, one
header-pair credential, one asynchronous job protocol (create, then poll the
detail route) and a `credits_used` meter on every job row, so nothing about it
needs a new engine capability.

## What Changes

- **connectors/creatify** — 3 endpoints against `https://api.creatify.ai`,
  `X-API-ID` / `X-API-KEY` header auth (a two-field credential, the
  contactout posture), inheriting the provider's lifecycle, credit pool and
  vendor-meter `usage.consolidate`.
  - `creatify#boreal-h3` — `POST /api/boreal/` with `model` pinned to
    `boreal-h3` at `input.toRequest`. Text-, image- and reference-to-video
    from one body.
  - `creatify#aurora` — `POST /api/aurora/` on the v1 tiers (`aurora_v1`,
    `aurora_v1_fast`, a caller choice).
  - `creatify#aurora-2` — `POST /api/aurora/` with `model_version` pinned
    to `aurora_v2`; resolution 480p to 2k.
- **One interned lifecycle.** The detail route is the create route plus the
  job id, read off the compiled request, so the three docs share one
  `start` and one `poll` fnTable entry each. In flight: `pending`,
  `in_queue`, `running`. Terminal: `done` (200 with the CDN mp4, or null
  `video_output` when the caller's `output_upload_url` took delivery),
  `failed` (synthesized 500) and `rejected` (422), both refunded by Creatify
  and zero-billed by the engine. No stop: the API has no cancel.
- **Per-second rate cards in Creatify API credits** (1 credit = USD 0.15):
  boreal-h3 one line per output tier (0.13 / 0.27 / 0.53 per second at
  768p / 1088p / 2k, the live public rate on 2026-10-22) plus reference-video
  seconds per tier and reference images beyond five; aurora one line per
  tier (1 / 0.5); aurora-2 one line per resolution (0.4 / 0.7 / 1.4 / 2.8).
  `credits_used` on the settled job row is the vendor claim and wins;
  boreal-h3 rounds its total up to the next half credit, which the rate
  algebra cannot express, so its runs carry a small `mismatch.derived` by
  design.
- **Estimates.** boreal-h3 deduces from the requested duration (plus the
  15 s reference-video cap when reference video is sent). Aurora's basis is
  the audio length, which only the vendor knows after fetching the file, so
  the estimate holds the tier ceiling (300 s; 60 s on 2.0, 15 s at 2k) and
  the settle counts the job row's `duration`.
- **Faithful mirrors, withheld fields.** `schema/inputs.ts` mirror the
  public OpenAPI (optionality only; defaults at the binding). `webhook_url`
  is deliberately not mirrored: Creatify authenticates the callback with the
  account's own API key as a bearer token, which must not travel to a URL a
  caller chose. Inputs the pinned model refuses (`audio_url`,
  `negative_prompt` on boreal-h3; `prompt_guidance_scale` on 2.0) are not
  offered. Strict objects, so a stray `model` or `webhook_url` is
  INVALID_INPUT before the wire.
- Synthetic replay fixtures (`synthetic-` prefix) covering the happy run per
  endpoint, failed, rejected, refused creation, done-without-output,
  caller-side delivery and an unknown status, until recordings with a live
  key land.

## Capabilities

- `creatify-connector`.

## Non-goals

- The Boreal v1 model on the same route, Creatify's other API products
  (lipsync avatars from a script, text to speech, voice clone, URL to video)
  and the Creative Agent: separate changes.
- Webhook delivery; this connector polls the documented detail route.
- A new category leaf: the three endpoints ride `video-generation`.

## Impact

New connector tree, three ids in `connectors/ids.lock.json`, and this
record. No schema, compiler or engine change.
