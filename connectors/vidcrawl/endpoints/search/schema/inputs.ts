import { z } from "zod";
import { zLangCode } from "../../../schema/common.ts";

/**
 * `POST /v1/search` request body matching `SearchRequestSchema`.
 */
export const zVidCrawlSearchBody = z.strictObject({
    query: z.string()
        .min(1)
        .max(200)
        .regex(/\S/)
        .describe("Search query string (1..200 chars)."),
    platform: z.enum(["youtube", "tiktok"])
        .describe(
            "Target video platform. Defaults to 'youtube' ('tiktok' returns 422 UNSUPPORTED_PLATFORM).",
        )
        .optional(),
    limit: z.number()
        .int()
        .min(1)
        .max(20)
        .describe("Maximum video results to return (1..20). Defaults to 5.")
        .optional(),
    scrape: z.boolean()
        .describe(
            "Also scrape each returned video in-line (adds 1 credit / $0.009 per scraped result). Defaults to false.",
        )
        .optional(),
    lang: zLangCode.optional(),
    source: z.enum(["live", "index"])
        .describe(
            "Search source: 'live' (default, 1 credit) searches YouTube live; 'index' queries VidCrawl's cached video index (0 credits, up to 1,000/day).",
        )
        .optional(),
    domain: z.string()
        .min(1)
        .max(200)
        .regex(/\S/)
        .describe(
            "Optional domain or channel filter (1..200 chars) when querying source 'index'.",
        )
        .optional(),
});
