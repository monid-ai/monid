import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI UGC Ad",
        summary:
            "Create a talking ad from an image and script with Kling 3.0, LTX or Veo",
        description:
            "Create an audio-inclusive talking UGC ad from an image and script with Kling 3.0, LTX 2.5 or Veo 3.1. Specify a model and resolution for a credit estimate; supported combinations and durations depend on the model and account plan. Poll the video project and save expiring output URLs promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
        notes: [
            "Kling 3.0 talking-ad rates verified 2026-10-27: 72 Magic Hour credits/second at 720p or 96 at 1080p, including audio. Inspect Monid for the hosted USD price; final project credits may differ. See https://docs.magichour.ai/api-reference/models.",
            "Supported durations are Kling 3–15 seconds; LTX 1–10 seconds and 15–60 in 5-second increments; Veo 4, 6, 8 and 15–141 in 7-second increments.",
            "LTX supports 480p, 720p and 1080p; Kling supports 720p and 1080p; Veo supports 720p. Availability depends on the account plan.",
            "Scripts must be nonempty after trimming and at most 1,804 characters for LTX, 2,304 for Kling or 2,500 for Veo. LTX and Kling dialogue wrappers count toward the model prompt limit.",
        ],
    },
    request: { method: "POST", path: "/v1/ai-ugc-ad" },
    input: {
        schema: {
            body: z.object({
                assets: z.object({
                    image_file_path: z.string().min(1).describe(
                        "Direct image URL with a supported file extension or uploaded file_path.",
                    ),
                }).strict(),
                script: z.string().min(1).describe(
                    "Spoken script. Trimmed maximum: 1,804 characters for LTX 2.5; 2,304 for Kling 3.0; 2,500 for Veo 3.1. LTX and Kling dialogue wrappers count toward the model prompt limit.",
                ),
                end_seconds: z.number().int().min(1).describe(
                    "Duration in seconds; permitted values depend on model. Free plans are limited to 5 seconds unless a credit pack was purchased.",
                ),
                model: z.enum(["kling-3.0", "ltx-2.5", "veo3.1"]).describe(
                    "Kling supports 3–15 seconds, LTX supports 1–10 seconds and 15–60 in 5-second increments; Veo supports 4, 6, 8 and 15–141 in 7-second increments.",
                ),
                resolution: z.enum(["480p", "720p", "1080p"]).describe(
                    "LTX supports all three; Kling supports 720p and 1080p; Veo supports 720p. Availability also depends on plan.",
                ),
            }).strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => {
            const { model, resolution, end_seconds: seconds } = data.input.body;
            const rate = model === "veo3.1"
                ? 360
                : model === "kling-3.0"
                ? (resolution === "1080p" ? 96 : 72)
                : resolution === "1080p"
                ? 144
                : resolution === "720p"
                ? 96
                : 48;
            return { counts: { CREDIT: seconds * rate } };
        },
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT: utils.json.optionalGet(data.output, "$.status") ===
                        "complete"
                    ? (utils.json.optionalNum(
                        data.output,
                        "$.credits_charged",
                    ) ?? 0)
                    : 0,
            },
        }),
    },
});
