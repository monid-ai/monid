# Tasks: add-connector-topaz

## 1. Provider

- [x] 1.1 `schema/video.ts`: `zVideoUrl` (case-insensitive extension and
      the hosted private-host rule, as a `pattern`), `zUpscaleBody` / `zSameSizeBody`, `zModel`
- [x] 1.2 `provider.ts`: meta, `X-API-Key` auth, baseUrl, timeouts, the
      express/status/record/cancel lifecycle, Topaz-credits pool, ledger
      `evidence`, `consolidate` claim + strip
- [x] 1.3 `categories.ts`: `video-enhancement` leaf (hosted manifest text)

## 2. Endpoints (12)

- [x] 2.1 `upscale`, `fix-artifacts`, `deinterlace`, `upscale-animation`,
      `recover-faces` — upscalers, Proteus-family rates
- [x] 2.2 `denoise`, `deblur`, `colorize` — same-size by default
- [x] 2.3 `upscale-creative` (Astra 2), `upscale-generative` (Starlight)
- [x] 2.4 `frame-interpolation` — new-frame gigapixel estimate
- [x] 2.5 `sdr-to-hdr` — H265 Main10, transfer function on hyp-1 only

## 3. Fixtures (synthetic)

- [x] 3.1 `synthetic-job-complete`, `-no-ledger`, `-no-download`,
      `synthetic-job-failed`, `synthetic-express-rejected`,
      `synthetic-express-no-request-id`, `synthetic-status-unavailable`

## 4. Tests

- [x] 4.1 `lifecycle.test.ts`: literal estimate table keyed by the twelve
      ids; happy chain per endpoint (whole usage + strip); ledger fallback;
      failed / no-download / rejected / no-requestId / status-503; stop
      cancel + UNRESOLVED; express body; per-endpoint knobs; model / 4K
      estimate rows; INVALID_INPUT gates with accepted near-twins;
      provenance; live test gated on the key AND `TOPAZ_LIVE_SPEND=1`
- [x] 4.2 Verify: fmt · lint · check · test · compile · version:check

## 7. Follow-ups (not in this change)

- [ ] 7.1 With a Topaz key: `deno task record` the happy, rejected and
      failed chains and replace the `synthetic-*` files
- [ ] 7.2 Image API endpoints once the engine carries multipart uploads and
      binary output (#170)
