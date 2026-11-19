import { z } from "zod";
import { zVideoUrl } from "../../../schema/common.ts";

/**
 * `POST /v1/agent` request body matching `AgentRequestSchema`.
 */
export const zVidCrawlAgentBody = z.strictObject({
    prompt: z.string()
        .min(1)
        .max(4000)
        .regex(/\S/)
        .describe(
            "Question or structured extraction instruction across the provided videos (1..4000 chars).",
        ),
    urls: z.array(zVideoUrl)
        .min(1)
        .max(10)
        .describe("1 to 10 public video URLs for the agent to analyze."),
    effort: z.enum(["low", "medium", "high"])
        .describe(
            "Reasoning and frame-inspection budget: 'low' (default, 3 credits = $0.027), 'medium' (5 credits = $0.045), or 'high' (10 credits = $0.090).",
        )
        .optional(),
    schema: z.record(z.string(), z.unknown())
        .describe(
            "Optional JSON Schema (<= 8192 serialized bytes) to shape the extracted `data` object.",
        )
        .optional(),
});
