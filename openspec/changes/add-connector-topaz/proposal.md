# Proposal: add-connector-topaz

## Why

Topaz Labs (topazlabs.com) is a live v1 monid-services provider: the models
behind Topaz Video AI — precision and generative upscaling, denoising, motion
deblur, deinterlacing, face recovery, colorization, SDR-to-HDR and frame
interpolation — as one async job API behind one `X-API-Key` credential, with
a published frames-per-credit rate card.

It is the first VIDEO-ENHANCEMENT connector (every other video connector
generates from a prompt), and the first async connector whose stop is a real
upstream cancel (`DELETE /video/{id}`).

## What Changes

- **connectors/topaz** — 12 endpoints, one per v1 video endpoint
  (`video/upscale`, `video/fix-artifacts`, `video/deinterlace`,
  `video/upscale-animation`, `video/recover-faces`, `video/denoise`,
  `video/deblur`, `video/colorize`, `video/upscale-creative`,
  `video/upscale-generative`, `video/frame-interpolation`,
  `video/sdr-to-hdr`), all async, all posting to `POST /video/express` and
  sharing the provider's auth, timeouts, lifecycle (`start` express → `poll`
  status + record → `stop` cancel), Topaz-credits pool, ledger evidence and
  `usage.consolidate` claim + strip.
- **The input is v1's flat shape** (design D2): `video_url`, the source's
  `frame_count` / `frame_rate` / `width` / `height`, the output size, a
  per-endpoint `model` enum and knobs, `keep_audio`. Each endpoint's
  `input.toRequest` assembles Topaz's express body.
- **The credit pool is Topaz credits** (design D3): the estimate applies the
  published frames-per-credit rates; the settled amount is the vendor's own
  `commit` ledger. No dollar conversion is pinned.
- **One new category leaf**, `video-enhancement`, with the hosted
  manifest's text.
- **The hosted source-URL rule** (`relayUrlIssue`): https only, no
  private, loopback, link-local or internal host, carried as a `pattern`
  (design D6).
- **Synthetic fixtures**: seven shared chains built from the shapes v1's
  2026-09-16 drill recorded.

## Capabilities

- `topaz-connector`.

## Non-goals

- **No Image API endpoints** (v1's 11 image endpoints). Topaz's image API
  takes a multipart file upload and returns binary image bytes, neither of
  which the engine can send or carry today (#170).
- **No CROSS-field validation** (e.g. `pnat-1` / `ganim-1` are 2x-only,
  `nxhf-1` / `nxf-1` cannot upscale, `sharpness` is `slp-2.6`-only). These
  live in `meta.notes`; Topaz rejects a bad pair itself, for free.
- **No live recordings.** Replace the `synthetic-*` chains with
  `deno task record` output once a key is wired here (tasks 7.1).

## Impact

New connector tree plus one category leaf. Connector-only: no engine bump, no
new `Unit` (`CREDIT` exists), no new preset, no hook-ABI change.
