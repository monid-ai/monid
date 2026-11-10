import { z } from "zod";

/**
 * `POST /v1/images/generations` request body.
 *
 * The gateway's published schema for this path is an `anyOf` over ONE ARM
 * PER IMAGE MODEL (125 of them, checked 2026-10-15 via
 * `GET https://api.aimlapi.com/docs-json?model=<id>&endpoint=openai/image-generations`):
 * every arm requires `model` and `prompt` and nothing else, and the rest
 * of each arm is the model's own vocabulary — `openai/gpt-image-2` takes
 * `n` / `size` / `quality` / `background`, `blackforestlabs/flux-dev` and
 * `alibaba/qwen-image-3` take `num_images` / `image_size` /
 * `num_inference_steps`, `google/gemini-nano-banana-2.1` takes
 * `aspect_ratio` / `resolution` and has no count knob at all.
 *
 * So the mirror is the INTERSECTION plus `z.looseObject` (keenable's
 * posture): the two universally required fields are typed, the two count
 * spellings are named because the estimate reads them, and every other
 * model-specific key rides through untouched. Inventing a merged superset
 * would type fields that most models reject, and defaulting a count knob
 * at the binding would MATERIALIZE it onto the wire for models that have
 * none — so neither is done here. Optionality only (D25).
 */
export const zImagesGenerationsBody = z.looseObject({
    model: z.string().min(1).describe(
        "Gateway image model id, vendor prefix included — e.g. " +
            "`blackforestlabs/flux-dev`, `openai/gpt-image-2`, " +
            "`alibaba/qwen-image-3`. List the ones callable here with " +
            "`aimlapi#models` (its `image` array); ids are never pinned in " +
            "this connector.",
    ),
    prompt: z.string().min(1).describe(
        "What to draw. Every image model on the gateway accepts this.",
    ),
    n: z.number().int().min(1).optional().describe(
        "How many images to generate, on the models that spell the count " +
            "`n` (the OpenAI-shaped arms). Vendor default 1.",
    ),
    num_images: z.number().int().min(1).optional().describe(
        "How many images to generate, on the models that spell the count " +
            "`num_images` (the fal-shaped arms). Vendor default 1.",
    ),
});
