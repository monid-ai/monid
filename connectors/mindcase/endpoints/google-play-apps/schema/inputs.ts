import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-play/apps` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-play/apps). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGooglePlayAppsBody = z.object({
    inputs: z.array(z.string())
        .describe("One or more inputs. One request reads them all.")
        .optional(),
    query: z.string()
        .describe("Search Query.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many apps to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    country: z.string()
        .describe(
            "Google Play country to read the store as, e.g. United States. Defaults to United States. Accepts one of 250 values; list them with GET https://api.mindcase.co/v1/data/google-play/apps?expand=options.",
        )
        .optional(),
    language: z.string()
        .describe("Language.")
        .optional(),
}).strict();
