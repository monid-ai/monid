import { z } from "zod";
import { zCountry } from "../../../schema/common.ts";

/** cloro POST /v1/monitor/bing request body (OpenAPI mirror). */
export const zBingBody = z.strictObject({
    query: z.string().min(1).max(3_500).describe(
        "The Bing search query. cloro trims it and counts its length after " +
            "URL encoding: at most 3,500, so non-Latin scripts allow fewer " +
            "characters; a longer query is a 400. JSON Schema cannot check " +
            "the encoded length, so this schema caps raw characters only.",
    ),
    country: zCountry.regex(/^(?!(?:CN|KR|RU)$)/).describe(
        "ISO 3166-1 alpha-2 country code (for example US). It sets Bing's " +
            "market. All countries except CN, KR and RU. The supported set " +
            "is at GET https://api.cloro.dev/v1/countries?model=bing.",
    ),
    pages: z.number().int().min(1).max(10).optional().describe(
        "Result pages to scrape (1-10). Default 1. Each page after the " +
            "first adds 2 credits.",
    ),
    first: z.number().int().min(1).optional().describe(
        "The result to start at, from 1. Default 1. Bing shows its AI " +
            "summary only on its first page, so there is no AI Overview " +
            "when first is above 1.",
    ),
    include: z.strictObject({
        html: z.boolean().optional().describe(
            "Include a URL to the full HTML of each Bing result page.",
        ),
        aioverview: z.union([
            z.boolean(),
            z.strictObject({
                markdown: z.boolean().optional().describe(
                    "Include the AI Overview as markdown.",
                ),
            }),
        ]).optional().describe(
            "Include the AI Overview, Bing's AI summary at the top of the " +
                "result page. true or an object adds the 2-credit AI " +
                "Overview add-on, also when Bing shows no AI summary.",
        ),
    }).optional(),
});
