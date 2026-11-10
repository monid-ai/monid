# aimlapi-connector (delta)

## ADDED Requirements

### Requirement: AI/ML API provider definition
The aimlapi provider SHALL declare name `aimlapi`, `request.baseUrl`
`https://api.aimlapi.com/v1`, a single `default` credit pool labelled
"US dollars", a provider-level `usage.consolidate` that plucks
`meta.usage` out of the payload and claims `meta.usage.usd_spent`
(omitting the entry when the node is absent, null, or the value is not
greater than zero), and a provider-level `output.fromError` that reads
`message`, then `error.message`.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `aimlapi#chat/completions`,
  `aimlapi#images/generations`, `aimlapi#models` and `aimlapi#key` exist

#### Scenario: The caller's own token counts survive the meter strip
- **WHEN** a chat run returns 200 with both a top-level `usage` of token
  counts and a `meta.usage` of `{credits_used, usd_spent}`
- **THEN** `meta.usage` is absent from the output and the top-level
  `usage` is unchanged

### Requirement: Attribution headers gated on the destination hostname
The provider's `auth.inject` SHALL inject
`Authorization: Bearer <apiKey>` on every request, and SHALL
ADDITIONALLY inject `X-AIMLAPI-Source: agent/monid`, `HTTP-Referer:
https://github.com/monid-ai/monid` and `X-Title: Monid` if and ONLY IF
the hostname parsed out of the resolved request url is EQUAL to
`api.aimlapi.com`. The comparison SHALL be equality on the parsed
hostname — never a substring, prefix or suffix test — after stripping any
userinfo and port, lowercased; a url with no scheme separator or a
bracketed IPv6 authority SHALL be treated as not matching. It SHALL
ALSO inject `X-AIMLAPI-Partner-ID` when, and only when, the connector's
partner-id constant is non-empty; the constant SHALL ship as monid's
registered partner id and SHALL be either empty or match
`^part_[A-Za-z0-9]{1,64}$`.

#### Scenario: The gateway is attributed
- **WHEN** a run's resolved destination is
  `https://api.aimlapi.com/v1/chat/completions`
- **THEN** the egressing request carries `X-AIMLAPI-Source`,
  `HTTP-Referer`, `X-Title` and `X-AIMLAPI-Partner-ID` with monid's
  registered partner id

#### Scenario: A look-alike host is not attributed
- **WHEN** the resolved destination is
  `https://api.aimlapi.com.example.net/v1/chat/completions`,
  `https://notapi.aimlapi.com/...`,
  `https://api.aimlapi.com@evil.example/...`, `https://aimlapi.com/...`
  or `https://api.aimlapi.com./...`
- **THEN** the egressing request carries its `Authorization` and NONE of
  the four attribution headers

#### Scenario: A base-url override moves attribution with the destination
- **WHEN** the same aimlapi doc is run with `request.baseUrl` pointing at
  a host other than `api.aimlapi.com`
- **THEN** no attribution header is sent, while the same doc run against
  the compiled destination is attributed

#### Scenario: No other connector is attributed
- **WHEN** any endpoint of another provider runs
- **THEN** none of the four headers appears on its wire, and no other
  compiled doc shares aimlapi's `auth.inject` fn

#### Scenario: Emptying the partner id is one literal
- **WHEN** the compiled inject fn's partner-id literal is replaced with
  an empty string
- **THEN** a gateway-bound request carries the other attribution headers
  and no `X-AIMLAPI-Partner-ID`, and a look-alike-bound request still
  carries none

### Requirement: Chat billed at the gateway's own credit meter
`chat/completions` SHALL meter one PER_UNIT `CREDIT` line at $0.0000005
per unit whose evidence is `meta.usage.credits_used` read off the raw
envelope (0 when absent), so the derived fold equals the consolidated
dollar claim. Its binding SHALL require `max_tokens` and default `n` to
1. Its estimate SHALL be, in credits,
`(bytes + 1000 + 8000 x images) x 500 + max_tokens x n x 2000`, where
`bytes` counts the UTF-8 bytes of text parts, assistant `tool_calls`,
`tools` and `response_format`, and `images` counts image parts. Those two
rates are a CEILING over every chat model rather than the chosen model's
own rate, derived from the vendor's published card
(`GET /v1/models?include=all`, `pricing.units[]`, dearest chat model
`openai/o1-pro` at 412.62 and 1,650.48 credits per token on 2026-10-15)
and rounded up for margin. The derivation SHALL be documented where the
rates are set.

#### Scenario: Plain completion settle
- **WHEN** a run returns 200 with
  `meta.usage: {credits_used: 21, usd_spent: 1.05e-05}`
- **THEN** usage is
  `{credits: {default: 0.0000105}, evidence: {CREDIT: 21}}` with no
  `mismatch`

#### Scenario: The hold covers the settle
- **WHEN** a 61-byte prompt with `max_tokens: 40` settles at 21 credits
- **THEN** the estimate is `(61 + 1000) x 500 + 40 x 2000` credits and is
  greater than the settled credits

#### Scenario: Unbounded request rejected
- **WHEN** a caller omits `max_tokens`
- **THEN** the run fails with INVALID_INPUT before any network call

### Requirement: Images billed at the same credit meter
`images/generations` SHALL meter the same PER_UNIT `CREDIT` line from
`meta.usage.credits_used` — a byte-identical `usage.evidence` interning
to one fnTable entry with `chat/completions` — and SHALL estimate
3,000,000 credits ($1.50, a ceiling over the dearest per-generation price
on the vendor's published card) per requested image,
counted as the greater of `n` and `num_images`, each defaulting to the
vendor's own 1. Its body SHALL be a loose mirror requiring only `model`
and `prompt`, so model-specific keys ride through unvalidated, and SHALL
NOT default either count knob.

#### Scenario: One-image settle
- **WHEN** a `blackforestlabs/flux-dev` run returns 200 with
  `meta.usage: {credits_used: 65000, usd_spent: 0.0325}`
- **THEN** usage is `{credits: {default: 0.0325}, evidence: {CREDIT:
  65000}}`

#### Scenario: Model-specific keys are not dropped
- **WHEN** a caller passes `image_size`, `seed` and
  `num_inference_steps` alongside `model` and `prompt`
- **THEN** the input clears the gate and the estimate is 2,000,000
  credits

#### Scenario: A promptless request is rejected
- **WHEN** a caller omits `prompt`, or passes it empty
- **THEN** the run fails with INVALID_INPUT before any network call

### Requirement: The model roster is free and projected by family
`models` SHALL be a FREE `GET /models` whose `output.fromResponse`
projects the roster to `{counts: {chat, chatRows, image, imageRows},
chat[], image[]}`, placing a row in `chat` when its `type` is
`openai/chat-completions` OR `anthropic/messages`, in `image` when its
`type` is `openai/image-generations`, and nowhere otherwise — MERGING BY
ID within each family, keeping each row's `id`, `name`, `developer`,
`contextLength`, `docsUrl` (null where unpublished) and `pricing`. The
gateway's `?type=` filter SHALL NOT be exposed. `key` SHALL be a FREE
`GET /key`.

`models` SHALL pin `include=pricing` as a `z.literal` default on
`input.schema.queryParams`, so the roster always carries the vendor's rate
card and a caller cannot request an expansion the output is not built on.
Each entry's `pricing` SHALL be `{currency, kind, variable, tiered,
units[]}` plus `inputUsdPerMTok` and `outputUsdPerMTok` on chat entries and
`usdPerImage` on image entries, where:

1. `units[]` holds every unit the card prices, as
   `{name, origin, usdPerUnit}` with `usdPerUnit = price / per`;
2. a unit with a non-numeric `price` SHALL be DROPPED, not read as free;
3. the named rates SHALL be the FIRST matching unit, scaled to the unit
   the vendor publishes in (per 1M tokens for chat, per generation for
   image), and `null` when no such unit is priced;
4. `variable` SHALL mirror the card's own flag and `tiered` SHALL be true
   when `thresholds[]` is non-empty, so a flat number is readable as the
   headline rate rather than the only one;
5. a row with no `pricing` SHALL project the same shape, empty.

#### Scenario: One id published under both chat types appears once
- **WHEN** the roster carries `anthropic/claude-haiku-5-5` as both
  `openai/chat-completions` and `anthropic/messages`, plus a third
  `anthropic/batches` row for the same id
- **THEN** it appears exactly once in `chat`, `chatRows` counts the two
  chat-family rows, and the batches row is dropped

#### Scenario: The openai/ prefix is not the discriminator
- **WHEN** the roster carries `openai/embeddings` and
  `openai/responses/submit` rows
- **THEN** neither appears in `chat`, while an id that ALSO has a
  `openai/chat-completions` row appears once

#### Scenario: A fixed-price chat model reports both named rates
- **WHEN** a chat row prices `token`/`provided` at $0.195 per 1M and
  `token`/`generated` at $0.78 per 1M
- **THEN** its `inputUsdPerMTok` is 0.195, its `outputUsdPerMTok` is 0.78,
  and `units` additionally keeps the cached-token and tool-`call` rates

#### Scenario: A variants-priced model reports no flat price
- **WHEN** an image row has `kind: "variants"`, `variable: true` and a
  `generation` unit whose `price` is null
- **THEN** `usdPerImage` is null, `units` is empty, and `variable` is true

#### Scenario: An unpriced row projects the empty shape
- **WHEN** a row carries no `pricing`
- **THEN** its `pricing` is the same object with null rates, empty
  `units`, and `variable`/`tiered` false

#### Scenario: A malformed roster does not fail the run
- **WHEN** the roster contains scalars, nulls, rows with no `id` and rows
  with no `type`
- **THEN** both families project empty and the run completes

#### Scenario: Free runs bill nothing
- **WHEN** a `models` or `key` run returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`

### Requirement: Errors are free and digested
Every endpoint SHALL settle a vendor non-2xx as provider-error data with
`{credits: {}, evidence: {}}` and a `message` digested from the gateway's
envelope.

#### Scenario: Unknown model
- **WHEN** the gateway answers 404 with
  `{message: "Model not found", error: {message: "Model not found"}}`
- **THEN** the run completes as provider-error data with
  `message: "Model not found"` and zero usage

#### Scenario: Invalid key
- **WHEN** the gateway answers 401
- **THEN** the run completes as provider-error data with the gateway's
  own refusal text and zero usage
