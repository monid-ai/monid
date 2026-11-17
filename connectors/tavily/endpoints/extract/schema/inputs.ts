import { z } from "zod";
import { zExtractionOptions } from "../../../schema/common.ts";

export const zTavilyExtractBody = z.object({
    urls: z.union([
        z.string().min(1),
        z.array(z.string().min(1)).min(1).max(20),
    ])
        .describe("One URL or a batch of 1–20 URLs to extract."),
    query: z.string().describe(
        "Rerank extracted chunks by relevance to this query.",
    ).optional(),
    ...zExtractionOptions.shape,
    timeout: z.number().min(1).max(60).describe(
        "Extraction timeout in seconds; vendor defaults to 10 for basic and 30 for advanced.",
    ).optional(),
    include_usage: z.boolean().describe(
        "Always sent as true by Monid for credit settlement.",
    ).optional(),
});
