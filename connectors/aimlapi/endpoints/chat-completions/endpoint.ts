import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zChatCompletionsBody } from "./schema/inputs.ts";

/**
 * AI/ML API `POST /chat/completions` — one blocking, non-streaming
 * completion against any of the gateway's ~365 chat models.
 *
 * Billing: the gateway reports its own charge on every response as
 * `meta.usage: {credits_used, usd_spent}`. That claim is consolidated at
 * provider level and WINS (design D27). The CREDIT is the gateway's own
 * unit, fixed at $0.0000005 (2,000,000 credits per dollar — verified on
 * both the chat and image endpoints, 2026-10-15), so this doc meters
 * `credits_used` directly: the derived fold reproduces the dollar claim
 * exactly and the per-run mismatch check stays silent. Nothing here pins a
 * per-model token rate: there are 365 chat models and the gateway's own
 * card moves, so a pinned table would be stale on arrival.
 *
 * The gateway DOES publish that card, machine-readably and without a key:
 * `GET /v1/models?include=all` carries a `pricing` object per row (so does
 * `?include=pricing`). It is not in `docs-json`, which documents no query
 * parameters for this path, but it is live and complete — all 932 rows on
 * 2026-10-15 — so the ceiling below is DERIVED FROM THE VENDOR'S OWN
 * NUMBERS rather than invented, and anyone can re-derive it.
 *
 * The estimate is still a CEILING PIN rather than a per-model rate (see
 * `estimate` below): `max_tokens` is REQUIRED at the binding (the primary
 * limiting knob — D25) and the hold prices the request above the dearest
 * chat model the card names. A hold that is too generous is the safe
 * direction; the settle trues down to the reported charge.
 */
export default defineEndpoint({
    meta: {
        displayName: "AI/ML API Chat Completions",
        summary: "Chat with ~365 models from many vendors through one " +
            "OpenAI-compatible call.",
        description: "OpenAI-compatible chat completions on AI/ML API. " +
            "Pick any chat model the gateway serves by its prefixed id — " +
            "`openai/gpt-4o-mini`, `anthropic/claude-opus-5.5`, " +
            "`deepseek/deepseek-v4-pro-0813`, `alibaba/qwen3-max`, … — and " +
            "the same request shape works for all of them, including the " +
            "models whose native API is Anthropic's `/messages`. Supports " +
            "system prompts, multi-turn history, image input on vision " +
            "models, function calling, JSON-schema structured output and " +
            "reasoning effort. Billed at the gateway's own reported charge " +
            "for the call. Use `aimlapi#models` to discover ids (it reports " +
            "the live roster, so no model list is baked in here) and " +
            "`aimlapi#images/generations` for pictures.",
        docsUrl: "https://docs.aimlapi.com/api-references/text-models-llm",
        categories: ["text-generation"],
        notes: [
            "Non-streaming only: the run returns one complete response.",
            "`max_tokens` is required here so the pre-run hold is bounded; " +
            "the bill is the gateway's reported charge, which is normally " +
            "far below the hold.",
            "The hold is a CEILING over the dearest chat model AI/ML " +
            "API publishes (see the doc comment on `estimate`), not the " +
            "chosen model's own rate, so it is deliberately generous and " +
            "the settle trues down to the gateway's reported charge.",
            "Model capabilities (vision, tools, structured output, " +
            "reasoning) vary per model — `aimlapi#models` carries each " +
            "row's own docs link.",
        ],
    },
    request: { method: "POST", path: "/chat/completions" },
    input: {
        schema: {
            // PRIMARY limiting knob (D25): the estimate's whole basis.
            // `n` is a behavior knob whose vendor default is 1 (verified
            // live 2026-10-15: an omitted `n` returns one choice), so it
            // is materialized at the binding and the estimate can read it.
            body: zChatCompletionsBody.required({ max_tokens: true }).extend({
                n: zChatCompletionsBody.shape.n.unwrap().default(1),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "gateway credits",
            description: "AI/ML API credits, the gateway's own billing " +
                "unit, fixed at $0.0000005 each",
            consumes: { credit: "default", amount: 0.0000005 },
        },
        /**
         * CEILING PIN, in gateway credits: one bound over every chat
         * model rather than the chosen model's own rate.
         *
         * DERIVED FROM THE VENDOR'S CARD, not invented. Re-derive with
         * `GET /v1/models?include=all` (no key needed): each row carries
         * `pricing.units[]`, every unit a `price` over a `per`, so the
         * price of ONE unit is `price / per` and the credit count is that
         * over $0.0000005. Across the two chat types
         * (`openai/chat-completions`, `anthropic/messages`) on
         * 2026-10-15 the dearest is `openai/o1-pro`:
         *   - input  $206.31 / 1M tokens = 412.62 credits per token;
         *   - output $825.24 / 1M tokens = 1,650.48 credits per token.
         * The hold rounds those up to 500 and 2,000 credits per token
         * (~21% of margin) so a price rise between releases does not
         * silently under-hold.
         *
         * Two dimensions a PER-REQUEST hold cannot bound, stated rather
         * than hidden: a chat model may bill tool use per `call` (up to
         * $0.065 each on `anthropic/claude-haiku-5-5`) and the call count
         * is not knowable before the run; and cache-write tokens are
         * charged on top of input. Neither is a money error — the D27
         * settle replaces the whole hold with the gateway's own claim —
         * but a run whose hold is exhausted by them stops early.
         * Priced over:
         *   - caller-sent input: UTF-8 bytes of text parts, assistant
         *     `tool_calls`, `tools` and `response_format` (byte-level BPE
         *     spends >= 1 byte per token, so bytes bound tokens);
         *   - 1,000 tokens of gateway-side prompt overhead;
         *   - 8,000 tokens per image part (vision models bill images as
         *     prompt tokens; the inline base64 bytes are NOT counted as
         *     text);
         *   - `max_tokens` x `n` at the output rate.
         * The settle replaces all of this with the reported charge, so an
         * over-generous hold costs a caller nothing but headroom.
         */
        estimate: ({ data }) => {
            const body = data.input.body;
            const texts = [""];
            let images = 0;
            for (const message of body.messages) {
                const content = "content" in message ? message.content : "";
                if (typeof content === "string") texts.push(content);
                else if (Array.isArray(content)) {
                    for (const part of content) {
                        if (part.type === "text") texts.push(part.text);
                        else images += 1;
                    }
                }
                if ("tool_calls" in message && message.tool_calls) {
                    texts.push(JSON.stringify(message.tool_calls));
                }
            }
            if (body.tools) texts.push(JSON.stringify(body.tools));
            if (body.response_format) {
                texts.push(JSON.stringify(body.response_format));
            }
            let bytes = 0;
            for (const text of texts) {
                for (const ch of text) {
                    const cp = ch.codePointAt(0) ?? 0;
                    bytes += cp <= 0x7f
                        ? 1
                        : cp <= 0x7ff
                        ? 2
                        : cp <= 0xffff
                        ? 3
                        : 4;
                }
            }
            const inputTokens = bytes + 1_000 + images * 8_000;
            return {
                counts: {
                    "CREDIT": inputTokens * 500 +
                        body.max_tokens * body.n * 2_000,
                },
            };
        },
        /** The gateway's own credit meter, read off the RAW envelope
         *  (`meta.usage.credits_used`, before the provider consolidate
         *  plucks that node out). Absent ⇒ 0: money follows evidence. */
        evidence: ({ data, utils }) => {
            const meter = utils.json.optionalGet(data.output, "$.meta.usage");
            const credits = meter === undefined || meter === null
                ? 0
                : utils.json.optionalNum(meter, "$.credits_used") ?? 0;
            return { counts: { "CREDIT": credits } };
        },
    },
});
