import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `app-store/app-keywords` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/app-store/app-keywords). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAppStoreAppKeywordsBody = z.object({
    apps: z.array(z.string())
        .describe(
            "App Store apps to look up: an apps.apple.com app URL or the numeric app ID (e.g. 324684580). One or more.",
        ),
    country: z.enum(["US"])
        .describe(
            "App Store country. Only United States is available for keyword data. Defaults to United States.",
        )
        .optional(),
    maxRank: z.number().int().min(1).max(1000)
        .describe(
            "Only keywords where the app ranks at this position or better, e.g. 10 for the top 10.",
        )
        .optional(),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many keywords to return per app, highest search volume first. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
