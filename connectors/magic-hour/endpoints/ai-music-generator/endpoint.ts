import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Music Generator",
        summary: "Generate music from a prompt",
        description:
            "Creates an asynchronous audio project, charged per requested second. Poll the audio project and save expiring output URLs promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["music-generation"],
    },
    request: { method: "POST", path: "/v1/ai-music-generator" },
    input: {
        schema: {
            body: z.object({
                name: z.string().optional(),
                duration: z.number().int().min(15).max(300).describe(
                    "Requested duration in seconds.",
                ),
                style: z.object({
                    prompt: z.string().min(1).describe(
                        "Describe the song, genre, mood, and instruments.",
                    ),
                    instrumental: z.boolean().describe(
                        "Generate without vocals; lyrics are ignored when true.",
                    ).optional(),
                    lyrics: z.string().describe(
                        "Custom lyrics; omit or leave blank for AI-generated lyrics.",
                    ).optional(),
                }).strict(),
            }).strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { CREDIT: data.input.body.duration },
        }),
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
