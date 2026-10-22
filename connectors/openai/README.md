# OpenAI images

Six public Monid endpoint identities, each pinned to one model and one
operation:

| Public path                             | Model                    | Native POST path         |
| --------------------------------------- | ------------------------ | ------------------------ |
| `/v1/image/gpt-image-2`                 | `gpt-image-2`            | `/v1/images/generations` |
| `/v1/image/gpt-image-2-edit`            | `gpt-image-2`            | `/v1/images/edits`       |
| `/v1/image/gpt-image-2.5-sunburst`      | `gpt-image-2.5-sunburst` | `/v1/images/generations` |
| `/v1/image/gpt-image-2.5-sunburst-edit` | `gpt-image-2.5-sunburst` | `/v1/images/edits`       |
| `/v1/image/gpt-image-2.5-flare`         | `gpt-image-2.5-flare`    | `/v1/images/generations` |
| `/v1/image/gpt-image-2.5-flare-edit`    | `gpt-image-2.5-flare`    | `/v1/images/edits`       |

## Inputs and wire mapping

`prompt`, `size` and `quality` are required. `background` is optional and uses
OpenAI's native `auto` default when omitted. GPT Image 2 accepts `low`, `medium`
and `high`; both 2.5 models also accept `xhigh` and `max`.

An edit additionally requires `images`: 1–16 public HTTPS URL strings. `mask` is
an optional HTTPS URL. The binding converts them to OpenAI's JSON spelling:
`images: [{image_url: "..."}]` and `mask: {image_url: "..."}`. OpenAI fetches
the URLs; the connector does not download images or send multipart forms.
References must be PNG/WEBP/JPG under 50 MB; a mask must be a PNG matching the
first image's dimensions and have an alpha channel. OpenAI validates remote
content.

Every request fixes `model`, `n: 1`, `output_format: "png"` and `stream: false`.
Unknown body keys are rejected. Sizes must have 16px-aligned edges, maximum edge
3840px, aspect ratio no greater than 3:1, and 655,360–8,294,400 total pixels.
The executable lifecycle checks these cross-field rules before egress and
returns a zero-billed `400 invalid_size`. JSON Schema carries the size syntax.
The pure estimate tolerates unsupported dimensions so callers that estimate
before execution still reach that error; non-finite output counts become zero.
An estimate does not certify that the dimensions are valid.

## Billing and estimates

All three direct Images API models have standard USD rates of $5/M input text
tokens, $8/M input image tokens and $30/M output image tokens. Each line is
priced per token, with no rounding up to thousand-token blocks. Successful
settlement reads `usage.input_tokens_details.{text_tokens,image_tokens}` and
`usage.output_tokens`, before any presentation changes. HTTP failures and
in-body errors bill zero. A success missing image data or a complete,
nonnegative integer receipt becomes a 502 with zero usage. Image checks cover
Base64 syntax and the PNG signature; full decoding and image dimensions remain
part of host artifact validation.

The rate card is a provider default. Receipt evidence is implemented once in
`provider.ts` and explicitly bound by all six endpoints: the compiler requires
doc-level hooks for models with multiple metered components. All six estimates
share one typed, provider-local factory in `schema/usage.ts`; the existing
`preset` carrier serializes the quality grid and reference flag as arguments
without adding shared-core presets or changing the engine ABI.

For valid dimensions, the output estimate reproduces the official calculator:
the long latent edge is 16/48/96 for Image 2's low/medium/high and
16/24/48/64/96 for Image 2.5's low/medium/high/xhigh/max. Divide by the image
aspect ratio and round the short edge to the nearest integer, with ties to even.
Output tokens are
`ceil(longEdge * shortEdge * (2_000_000 + width * height) / 4_000_000)`. The
short edge preserves the calculator's evaluation order,
`longEdge / (max(width, height) / min(width, height))`, because algebraically
equivalent multiplication can round differently near half-way boundaries.

Prompt UTF-8 byte count approximates text tokens conservatively without loading
a tokenizer. Reference estimates reserve 1,500 tokens per URL image, following
Monid's published endpoint notes; a supplied mask gets the same allowance.
Neither input estimate is an exact tokenization or a guaranteed cost ceiling:
the host should reconcile the actual receipt. The private adaptor's estimate and
live high-fidelity reference counts still need comparison.

Batch and streaming are excluded. Cached-input pricing is excluded because the
official guide limits it to the Responses API image tool, not direct Images API
requests. There is no vendor dollar receipt, so no `usage.consolidate` hook.

## Output and hosted integration boundary

The native response is preserved, including `data[].b64_json` (PNG), generation
metadata and `usage`. **This connector does not produce the hosted catalog's
`image` artifact or its seven-day signed download URL.**

The public engine's host ABI has JSON HTTP capabilities but no artifact-upload
or storage port. The hosting application must decode the PNG, persist it and
create the `image` artifact with the existing seven-day retention policy. The
legacy `monid-services` adaptor was unavailable during this port, so this seam
is explicit rather than a fabricated URL. Confirm the host-side adapter before
replacing the hosted endpoint implementation. No engine ABI/version is changed.

## Local use and validation

Set `OPENAI_CREDENTIALS_API_KEY` (or its `OPENAI_API_KEY` alias) locally. This
must be an OpenAI vendor key, not a `monid_live_...` key. Then run:

```sh
deno task engine:run 'openai#v1/image/gpt-image-2.5-sunburst' \
  --body '{"prompt":"a lighthouse at dusk","size":"1024x1024","quality":"low"}'
```

This command contacts OpenAI and costs money. Offline validation requires no key
or network:

```sh
deno test --allow-read --allow-env --allow-write connectors/openai
deno task check
deno task test
```

Fixtures are synthetic, shared provider-level chains. The tiny PNG only
represents the native payload shape; it is not a live model result. Each
endpoint has a live smoke test gated on OpenAI credentials; live tests require
network permissions. Running the full live suite makes six paid calls; edit
tests use a public reference image from the official image-generation guide.
Replace synthetic fixtures with sanitized recordings once vendor credentials and
the legacy adaptor are available.

## Sources

- Six public contracts: `monid inspect -p openai -e <public path> --json`,
  checked 2026-10-17.
- [Native generation JSON API](https://developers.openai.com/api/reference/resources/images/methods/generate).
- [Native edit JSON API](https://developers.openai.com/api/reference/resources/images/methods/edit).
- [Image generation guide, token calculator and cached-input scope](https://developers.openai.com/api/docs/guides/image-generation).
- [GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2),
  [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst),
  [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare).
