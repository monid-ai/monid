import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `app-store/apps` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/app-store/apps). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAppStoreAppsBody = z.object({
    appIds: z.array(z.string())
        .describe("One or more app ids. One request reads them all.")
        .optional(),
    query: z.string()
        .describe("Search Query.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many apps to return in total. Defaults to 10; use 0 for all.",
        )
        .optional(),
    country: z.string()
        .describe(
            "App Store country (storefront) to read, e.g. United States. Defaults to United States. Accepts one of 175 values; list them with GET https://api.mindcase.co/v1/data/app-store/apps?expand=options.",
        )
        .optional(),
    language: z.string()
        .describe("Language.")
        .optional(),
}).strict();
