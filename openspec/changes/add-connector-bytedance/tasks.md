# Tasks: add-connector-bytedance

## 1. Vocabulary

- [x] 1.1 `connectors/categories.ts`: add the `video-generation` leaf

## 2. Provider

- [x] 2.1 `schema/content.ts`: shared vendor mirror — `zRefUrl`, `zRatio`,
      `contentItem`/`contentArray({caps})`, `sharedTaskFields`
- [x] 2.2 `provider.ts`: meta + 6 shared notes, bearer auth, baseUrl,
      timeouts (D10), `lifecycle.start`/`poll` (D7), `output.fromError`
      envelope unwrap, dollar credit pool, `usage.consolidate` token strip (D9)

## 3. Endpoints (4)

- [x] 3.1 `seedance-2-0` — 480p/720p/1080p/4k, 8 rate lines, 15s
- [x] 3.2 `seedance-2-0-fast` — 480p/720p, 4 rate lines, 15s
- [x] 3.3 `seedance-2-0-mini` — 480p/720p, 4 rate lines, 15s
- [x] 3.4 `seedance-2-5` — 480p/720p, 4 rate lines, 30s, `"auto"` duration,
      `output_format`, audio-only references, 5 task-type notes
- [x] 3.5 Each: pinned `endpoint` identity (D1), `input.toRequest` model
      injection (D8), doc-level `estimate` + `evidence` (D3/D5)

## 4. Verify the shape before spending money

- [x] 4.1 `compiler:compile` + `catalog inspect` each doc
- [x] 4.2 `engine:estimate` — 720p×5s ⇒ 108,000 tokens ⇒ $0.756 on 2.0

## 5. Live

- [x] 5.1 Smoke: `engine:run bytedance#seedance-2.0-mini` end to end — real
      video in 122s, settled 40,594 tokens / $0.142079
- [x] 5.2 Recorded `task-succeeded` (4 calls → trimmed to 3),
      `task-succeeded-ref-video`, `submit-rejected`; signed result URLs
      redacted, raw per-endpoint recordings removed
- [x] 5.3 Hand-built `synthetic-task-failed`, `synthetic-task-no-video-url`,
      `synthetic-poll-failed` — none can be provoked on demand; bodies copied
      from live recordings so only `status`/`error` are authored

## 6. Tests

- [x] 6.1 `test-inputs.json` + `lifecycle.test.ts`: happy chain across every
      endpoint id folded from each doc's OWN rate card; the reference-video
      column; the 67%-overcharge guard; failed / no-video-url / rejected-submit
      / poll-503 shapes
- [x] 6.2 Estimate asserts (published worked example, 4K ratio table,
      reference-video column, `"auto"` upper bound) + 5 INVALID_INPUT asserts
- [x] 6.3 Live test gated on `BYTEDANCE_API_KEY` — passes against real Ark
- [x] 6.4 README connector row
- [x] 6.5 Verify: fmt · lint · check · test (200 passed) · double-compile
      (byte-identical) · version:check

## 7. Follow-ups (not in this change)

- [ ] 7.1 Type the `input.toRequest` slot in `defineEndpoint` (design D8
      authoring note) — type-only, no doc-format impact
- [ ] 7.2 Re-read the `requestMs: 60_000` tail once the >30s calls are no
      longer censored by the old cap (design D10)
