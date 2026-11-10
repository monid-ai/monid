# Design: add-connector-topaz

Decision record for the Topaz video port. v1 source:
`monid-services/services/shared/providers/adaptors/topaz/` (the
`endpoints/video/*` half; drill records in `provider.test.ts`, 2026-09-16).
Precedent: kling (provider-level async lifecycle, shared synthetic chains,
literal estimate table).

## D1 — One endpoint per v1 video endpoint; ids pinned

Every Topaz job posts to the SAME `POST /video/express`, and the model is a
field of the body, so the derived `?? request.path` identity would collide.
Each endpoint pins `endpoint: "/video/<name>"` — v1's grouping by task
(upscale, denoise, ...) with the models that serve that task as a `model`
enum. Single-model endpoints (`deblur`, `colorize`, `upscale-creative`) take
no `model` field at all.

## D2 — The input is v1's flat shape, assembled by `toRequest`

The express body is Topaz's internal job description: `source` metadata with
`external: {provider: "s3", presignedUrl}`, one `filters[]` entry, and an
`output` block that must state encoder, profile, container, audio transfer
and `dynamicCompressionLevel` (omitting the last is a 500 upstream, v1
drill). None of those choices are the caller's — they are how v1 makes a
job succeed — so mirroring the wire body would hand every caller a body
they can only get wrong. The published input stays v1's: what the source is,
what size to output, which model, which knobs. Cost, stated: this departs
from the mirror-the-vendor default kling took (its D2); the wire shape is
pinned by the `expressBody` test instead.

Defaults are applied at the binding (`.default()`), so the estimate and the
`toRequest` read concrete values: `model` (per endpoint), `keep_audio: true`,
Astra `creativity 0` / `realism 0` / `sharp 0.5`, interpolation `slowmo 1` /
`duplicate false`, Hyperion `transfer_function: "hlg"`.

## D3 — The pool is Topaz credits; the ledger is the claim

Topaz meters in credits: the record's `transactions[]` reserves, then
`commit`s the real amount. `credits.default = {label: "Topaz credits"}`; the
provider-level `evidence` sums the `commit` rows (falling back to Topaz's
own `estimates.cost[0]`, which matched the ledger on every v1 drill), and
`usage.consolidate` claims the same sum and strips the ledger and the
account fields (v1's `VIDEO_INTERNAL_FIELDS`) from the output. No dollar figure is
pinned.

The estimate is per endpoint: frames ÷ frames-per-credit for the chosen
model, at the HD rate up to 1920x1080 (either orientation) and the 4K rate
above, ceiled, at least 1. Frame interpolation bills the NEW frames per
gigapixel (2 credits, 1 on the Fast models). Rates:
https://developer.topazlabs.com/video-models, checked 2026-10-22.

## D4 — Lifecycle

- `start`: non-2xx express is data (zero-billed); a 2xx with no `requestId`
  THROWS (nothing to poll — v1 treats it as infrastructure); else RUNNING
  with `externalRunId`.
- `poll`: `GET /video/{id}/status`; a non-2xx THROWS (the job may still be
  billing); `failed` / `canceled` / `canceling` are OUR 500 with the status
  body; anything but `complete` keeps polling; `complete` reads
  `GET /video/{id}` and returns 200 with the record, or OUR 502 when it has
  no `destination.download.url`.
- `stop`: `DELETE /video/{id}`; a 2xx settles nothing (STOPPED_UNSETTLED —
  a canceled job delivers no output); anything else is UNRESOLVED.

## D5 — Timeouts

`runMs` 30 min (v1 parity). Diffusion models (Astra, Starlight) can queue
upstream for most of it. A run that times out is zero-billed to the CALLER
(TIMED_OUT never settles), which is what the v1 notes' "at no charge" says.
The upstream job may still complete and draw credits from the HOST's Topaz
account — a cost the engine cannot see, the same class as kling 7.3.

## D6 — The source-URL host rule rides the `pattern`

v1 checks `video_url` with `relayUrlIssue` (a `superRefine`): https only,
and no localhost, `*.internal`, IPv6 literal, or loopback / 0/8 / private /
link-local IPv4 literal. A refinement does not survive compilation, so the
same rule is spelled as negative lookaheads in the JSON Schema `pattern`.
v1 runs it on the PARSED hostname, where `2130706433` or `0x7f.1` has
already become 127.0.0.1; a pattern sees the raw text, so any numeric host
that is not a canonical dotted quad is refused as well.
