import { z } from "zod";
import { zCountry } from "../../../schema/common.ts";

/** cloro POST /v1/monitor/bing request body (OpenAPI mirror). */
export const zBingBody = z.strictObject({
    query: z.string().min(1).max(3_500).describe(
        "The Bing search query. At most 3,500 characters after URL " +
            "encoding; a longer query is a 400.",
    ),
    country: zCountry.describe(
        "ISO 3166-1 alpha-2 country code (for example US). It sets Bing's " +
            "market. All countries except CN, KR and RU. The supported set " +
            "is at GET https://api.cloro.dev/v1/countries?model=bing.",
    ),
    include: z.strictObject({
        html: z.boolean().optional().describe(
            "Include a URL to the full HTML of the Bing result page.",
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
