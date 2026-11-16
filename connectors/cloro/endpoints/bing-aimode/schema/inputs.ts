import { z } from "zod";
import { zCountry, zState } from "../../../schema/common.ts";

/** cloro POST /v1/monitor/bing/aimode request body (OpenAPI mirror). */
export const zBingAimodeBody = z.strictObject({
    prompt: z.string().min(1).max(3_500).describe(
        "The prompt to send to Bing AI Mode. At most 3,500 characters " +
            "after URL encoding; a longer prompt is a 400.",
    ),
    country: zCountry,
    state: zState.optional(),
    include: z.strictObject({
        markdown: z.boolean().optional().describe(
            "Include the answer as markdown.",
        ),
        html: z.boolean().optional().describe(
            "Include a URL to the full HTML of the response.",
        ),
    }).optional(),
});
