import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-play/app-keywords` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-play/app-keywords). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGooglePlayAppKeywordsBody = z.object({
    apps: z.array(z.string())
        .describe(
            "Google Play apps to look up: a play.google.com app URL or the package name (e.g. com.spotify.music). One or more.",
        ),
    country: z.enum(["US"])
        .describe(
            "Google Play country. Only United States is available for keyword data. Defaults to United States.",
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
