# Proposal: add-connector-aimlapi

## Why

[AI/ML API](https://aimlapi.com) is a single OpenAI-compatible gateway in
front of hundreds of models from many vendors: 365 chat models (GPT,
Claude, Gemini, DeepSeek, Qwen, Kimi, Llama, Mistral, …), 125 image
models (FLUX, GPT-Image, Qwen-Image, Seedream, Imagen, …), plus
embeddings, audio and video families — one key, one base url, one bill.
Submitted by the vendor.

It fills the same catalog gap a general-purpose LLM connector fills — an
agent on Monid delegating a sub-task to a different model, a cheaper one
for bulk work, a reasoning one for a hard step — and does it across
vendors behind one credential instead of one vendor's own API. Every
endpoint here is a synchronous JSON request, so nothing needs a new
engine capability.

## What Changes

- **connectors/aimlapi** — provider (Bearer auth on
  `https://api.aimlapi.com/v1`, US-dollar pool, provider-level
  `usage.consolidate` and `output.fromError`) + 4 endpoints:
  `chat/completions`, `images/generations`, `models`, `key`.
- **Vendor claim on both billable endpoints.** Chat and image responses
  report the gateway's own charge as
  `meta.usage: {credits_used, usd_spent}`. The provider consolidate
  plucks that node and the claim wins (D27). The CREDIT is the gateway's
  NATIVE unit at a fixed rate — 8 credits / $0.000004 on a chat call and
  65,000 / $0.0325 on an image call are both exactly 2,000,000 credits
  per dollar, i.e. $0.0000005 each (verified live 2026-10-15) — so both
  endpoints meter `credits_used` and the derived fold reproduces the
  dollar claim exactly, leaving `usage.mismatch.derived` silent. One
  byte-identical `usage.evidence` serves both docs and interns to one
  fnTable entry. `pluck` is used rather than `omit` on purpose: the chat
  envelope also carries a top-level `usage` of token counts, which is the
  caller's and must survive.
- **Holds are CEILINGS DERIVED FROM THE VENDOR'S OWN CARD.** AI/ML API
  publishes a machine-readable rate card, and it needs no key:
  `GET /v1/models?include=all` (equally `?include=pricing`) returns a
  `pricing` object on every one of the 932 rows — `units[]`, each with a
  `price` over a `per`, plus `kind`, `thresholds`, `dimensions` and
  `variants`. `docs-json` documents no query parameters for that path, so
  the parameter is undocumented but live and complete (checked
  2026-10-15). A per-model table is still not pinned here — 365 chat
  models and a card that moves — but the two ceilings are read off that
  card rather than asserted: across `openai/chat-completions` and
  `anthropic/messages` the dearest is `openai/o1-pro`, $206.31/1M input
  and $825.24/1M output, i.e. 412.62 and 1,650.48 credits per token, and
  the hold rounds up to 500 and 2,000 (~21% margin, so a price rise
  between releases does not silently under-hold). It is priced over
  prompt UTF-8 bytes + 1,000 tokens of gateway overhead + 8,000 tokens
  per image part, times `n` on the output half, with `max_tokens`
  required at the binding (the primary limiting knob — D25).
  `images/generations` holds $1.50 per requested image against a dearest
  published per-generation price of $1.04 (`meshy/meshy-6-image-to-3d`).
  Two dimensions a per-request hold cannot bound are stated in the doc
  comments rather than hidden: tool `call` charges on chat (up to $0.065
  each, count unknowable before the run) and the 43 image models priced
  per `megapixel` or output `token`, where a very large render scales past
  the hold. Neither is a billing error — the D27 settle replaces the hold
  with the gateway's own claim — but a run can stop on an exhausted
  hold.
- **PRICES COME FROM THE VENDOR, through `aimlapi#models`.** The same
  endpoint that lists the roster publishes the card, so `include=pricing`
  is pinned as a `z.literal` default on the binding (not `all`, which
  triples the payload for fields nothing projects; not an open string,
  which the gateway would ignore and quietly null every price). Each entry
  gets `pricing: {currency, kind, variable, tiered, units[]}` with
  `usdPerUnit = price / per`, plus the two rates a model is actually
  chosen on — `inputUsdPerMTok`/`outputUsdPerMTok` for chat,
  `usdPerImage` for image. Three shapes are flagged rather than
  flattened: `kind: "variants"` prices through a matrix and leaves the
  unit's `price` null (the flat number is then null, never zero),
  `thresholds[]` are volume tiers, and a model may publish several units
  of one name (tool `call` tiers) — `units` keeps them all. The parameter
  is undocumented upstream, so the live test asserts that at least 90% of
  the chat roster comes back priced: if the gateway stops honouring it,
  that fails loudly instead of nulling every price in silence.
- **No model name is pinned anywhere.** `aimlapi#models` reports the live
  roster instead. That endpoint is also where the gateway's one real
  modelling trap is handled: the list mixes every endpoint family and the
  ONLY discriminator is a `type` field, where `openai/chat-completions`
  and `anthropic/messages` are BOTH chat (one call shape serves both) and
  a model id may appear once per family. 932 rows on 2026-10-15 carry 395
  chat-family rows that MERGE BY ID to 365 distinct chat models, and 125
  image rows. `type` is not a prefix test: `openai/embeddings` and
  `openai/responses/submit` share the `openai/` prefix and are not chat.
  The gateway's own `?type=` filter is deliberately not exposed — it
  takes one type, and one run is one request, so a caller-chosen type
  would make the two-type chat family unrepresentable.
- **Attribution, gated on the DESTINATION.** Requests that reach the
  gateway carry `X-AIMLAPI-Source: agent/monid`, `HTTP-Referer` (this
  repo) and `X-Title: Monid`, plus `X-AIMLAPI-Partner-ID` carrying the
  partner id AI/ML API registered for monid. The headers ride on
  `auth.inject`, not
  `request.headers`: static headers are attached by the compiler and
  would egress to WHATEVER host the resolved url names, whereas
  `auth.inject` is the last hook before the wire and the only one handed
  the resolved url, so a `request.baseUrl` override moves attribution
  with it. The host test is EQUALITY on the parsed hostname — never a
  substring or suffix test, which would hand the partner id to
  `api.aimlapi.com.example.net`. `URL` is not a whitelisted closed-term
  global, so the authority is cut out with string ops and anything
  unparseable falls through unattributed. The partner id is one literal;
  a test reads it back out of the compiled fn, pins it to monid's
  registered id and holds it to `^$|^part_[A-Za-z0-9]{1,64}$`, and an
  empty literal omits the header entirely rather than sending it blank.
- **Faithful mirrors, scoped.** `chat/completions` mirrors the
  OpenAI-compatible body with optionality only; `n` is defaulted to 1 at
  the binding (verified vendor default). `images/generations` is a
  `z.looseObject` over `{model, prompt}` — the gateway's published schema
  for that path is an `anyOf` of ONE ARM PER MODEL (125 of them) whose
  only universal fields are those two, with the count knob spelled `n` on
  OpenAI-shaped models, `num_images` on fal-shaped ones and absent on
  others, so a merged superset would type fields most models reject and a
  binding default would materialize a field onto the wire for models that
  have none.
- **Category** — new leaf `text-generation` in `connectors/categories.ts`
  (the GENERATIVE group, beside `image-generation`), since no existing
  leaf names an LLM completion.
- Real recorded fixtures as provider-level shared chains (8) with
  `{{request.url}}` bindings, plus replay, schema-gate, attribution and
  gated-live tests.

## Capabilities

- `aimlapi-connector`.

## Non-goals

- **Streaming** (`stream: true`) — the engine settles one envelope; an
  SSE body would arrive as an undecodable string.
- **`max_completion_tokens`** — the newer OpenAI spelling of the same
  cap. Exposing both would give the pre-run hold two knobs to disagree
  about; the connector takes `max_tokens`, which every chat model on the
  gateway accepts.
- **`/v1/embeddings`**, **`/v1/responses`**, the audio and video families
  — real surfaces, but each is its own rate story (and the video and
  speech-to-text families are `internal/*/submit` async jobs needing the
  lifecycle hooks), so they are follow-ups.
- **`/v1/images/editing`** and the image-to-image models — image inputs
  (multipart or large base64).
- **Anthropic-native `/v1/messages`, batches** — every chat model that
  publishes an `anthropic/messages` row also publishes an
  `openai/chat-completions` one, so the OpenAI-compatible path reaches
  all of them; batches are an async protocol of their own.
- **A pinned per-model rate card** — the card exists and is read both to
  set the ceilings above and, live, through `aimlapi#models`; what is not
  done is COPYING it into the source tree, where 365 models whose prices
  move would be stale on arrival.

## Impact

New connector tree, one new category leaf, four new ids in
`connectors/ids.lock.json`; no schema/engine/compiler changes — version
stays.

Note for review: `text-generation` is the same new leaf
`add-connector-venice` introduces, in the same place and with the same
text — whichever lands second drops its copy.
