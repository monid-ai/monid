import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zImagesGenerationsBody } from "./schema/inputs.ts";

/**
 * AI/ML API `POST /v1/images/generations` — text to image, across the
 * gateway's ~125 image models.
 *
 * Billing is the same story as chat: the response carries
 * `meta.usage: {credits_used, usd_spent}` (verified live 2026-10-15 —
 * `blackforestlabs/flux-dev` answered `{credits_used: 65000,
 * usd_spent: 0.0325}`, i.e. the same 2,000,000 credits per dollar), the
 * provider consolidate claims the dollars, and this doc meters the
 * gateway's own CREDIT so the derived fold reproduces the claim.
 * `usage.evidence` here is BYTE-IDENTICAL to the chat endpoint's and
 * therefore interns to one fnTable entry (asserted in
 * `endpoint.test.ts`) — the meter is a gateway-wide fact, not a
 * per-endpoint one.
 */
export default defineEndpoint({
    meta: {
        displayName: "AI/ML API Image Generation",
        summary: "Generate images with ~125 models — FLUX, GPT-Image, " +
            "Qwen-Image, Seedream, Imagen — behind one key.",
        description: "Generate images from a text prompt on AI/ML API. " +
            "Pick any image model the gateway serves by its prefixed id " +
            "(`blackforestlabs/flux-dev`, `openai/gpt-image-2`, " +
            "`alibaba/qwen-image-3`, `bytedance/seedream-5-0-pro`, …) and " +
            "pass whatever that model's own options are alongside " +
            "`prompt`: the gateway documents one request arm per model, so " +
            "model-specific keys (`size`, `quality`, `image_size`, " +
            "`aspect_ratio`, `num_inference_steps`, `seed`, …) ride " +
            "through untouched. The response is " +
            "`{data: [{url}]}` — hosted image URLs, not base64. Billed at " +
            "the gateway's own reported charge for the call. Discover ids " +
            "with `aimlapi#models` (its `image` array).",
        docsUrl: "https://docs.aimlapi.com/api-references/image-models",
        categories: ["image-generation"],
        notes: [
            "Only `model` and `prompt` are universal; every other field is " +
            "the chosen model's own and is passed through unvalidated. A " +
            "key a model does not know is rejected by the gateway with a " +
            "400 naming it.",
            "The count knob is spelled `n` on OpenAI-shaped models and " +
            "`num_images` on fal-shaped ones, and some models (e.g. " +
            "`google/gemini-nano-banana-2.1`) have none. Neither is " +
            "defaulted here: a default would be sent on the wire to " +
            "models that reject it.",
            "The hold is a CEILING of $1.50 per requested image, over " +
            "the dearest per-generation price AI/ML API publishes (see " +
            "`estimate`); the settle trues down to the reported charge.",
        ],
    },
    request: { method: "POST", path: "/images/generations" },
    input: { schema: { body: zImagesGenerationsBody } },
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
         * CEILING PIN, in gateway credits: $1.50 per requested image =
         * 3,000,000 credits.
         *
         * DERIVED FROM THE VENDOR'S CARD, like the chat hold. Re-derive
         * with `GET /v1/models?include=all` (no key needed) over
         * `type == "openai/image-generations"`: the dearest PER-GENERATION
         * price on 2026-10-15 is $1.04 (`meshy/meshy-6-image-to-3d`), and
         * a typical diffusion image is cents (`flux/dev` measured at
         * $0.0325). $1.50 rounds that up with ~44% of margin.
         *
         * What this bounds and what it cannot: 82 of the 125 image models
         * price per `generation`, which the count below bounds exactly.
         * The rest price per `megapixel` (up to $0.208) or per output
         * `token` (up to $0.13), where the charge scales with a size this
         * endpoint does not type — the loose body takes whatever size key
         * the chosen model knows — so a very large render can exceed the
         * hold. The D27 settle still replaces the hold with the gateway's
         * own claim, so this costs a run that runs out of hold, never a
         * wrong bill.
         *
         * The count is the larger of the two spellings the gateway uses,
         * each falling back to the vendor default of 1 that every arm's
         * own schema declares — honest optionality: a model with no count
         * knob holds for exactly one image.
         */
        estimate: ({ data }) => {
            const body = data.input.body;
            const n = body.n === undefined ? 1 : body.n;
            const numImages = body.num_images === undefined
                ? 1
                : body.num_images;
            return {
                counts: {
                    "CREDIT": Math.max(n, numImages) * 3_000_000,
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
