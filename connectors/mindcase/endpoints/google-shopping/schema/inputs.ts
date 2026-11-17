import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google/shopping` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google/shopping). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleShoppingBody = z.object({
    queries: z.string()
        .describe("Google Shopping search query to run."),
    maxResults: z.number().int()
        .describe("Number of products to return. Use 0 for all.")
        .optional(),
    dateRange: z.enum(["anytime", "qdr:h", "qdr:d", "qdr:w", "qdr:m"])
        .describe("Limit results to recently-listed products.")
        .optional(),
    country: z.string()
        .describe(
            "Country to search Google Shopping from. Accepts one of 58 values; list them with GET https://api.mindcase.co/v1/data/google/shopping?expand=options.",
        )
        .optional(),
    language: z.enum([
        "en",
        "es",
        "fr",
        "de",
        "it",
        "pt",
        "nl",
        "sv",
        "no",
        "da",
        "fi",
        "tr",
        "ru",
        "uk",
        "cs",
        "el",
        "hu",
        "ro",
        "bg",
        "he",
        "ar",
        "hi",
        "bn",
        "ta",
        "te",
        "zh",
        "ja",
        "ko",
        "th",
        "vi",
        "id",
        "ms",
    ])
        .describe("Language for results.")
        .optional(),
}).strict();
