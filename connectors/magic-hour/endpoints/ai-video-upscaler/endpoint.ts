import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Video Upscaler",
        summary: "Upscale a video",
        description:
            "Creates an asynchronous video upscale. A paid Magic Hour plan is required. Poll the video project and save expiring output URLs promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
        notes: [
            "The end time must exceed the start time. The API limits output to 4,000 frames at 30 fps; a paid plan is required.",
        ],
    },
    request: { method: "POST", path: "/v1/ai-video-upscaler" },
    input: {
        schema: {
            // The vendor OpenAPI leaves body/assets additionalProperties unrestricted.
            // Magic Hour ignores unknown properties; keep the input mirror permissive.
            body: z.object({
                name: z.string().optional(),
                start_seconds: z.number().min(0).describe(
                    "Start time in seconds; defaults to 0.",
                ).optional(),
                end_seconds: z.number().min(0.1).describe(
                    "End time in seconds; must exceed the start time. The output is limited to 4,000 frames at 30 fps.",
                ),
                resolution: z.enum(["720p", "1080p", "2k", "4k"]).describe(
                    "720p and 1080p set the short side; 2k and 4k set the long side. Aspect ratio is preserved.",
                ),
                assets: z.object({
                    video_file_path: z.string().min(1).describe(
                        "Direct video URL with a supported file extension or uploaded file_path.",
                    ),
                }),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => {
            const duration = data.input.body.end_seconds -
                (data.input.body.start_seconds ?? 0);
            return {
                counts: {
                    CREDIT: Math.round(
                        Math.max(0, duration) *
                            (data.input.body.resolution === "720p"
                                ? 30
                                : data.input.body.resolution === "1080p"
                                ? 40
                                : data.input.body.resolution === "2k"
                                ? 50
                                : 60),
                    ),
                },
            };
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
