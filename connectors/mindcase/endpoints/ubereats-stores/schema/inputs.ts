import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ubereats/stores` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ubereats/stores). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zUbereatsStoresBody = z.object({
    location: z.string()
        .describe("Location."),
    query: z.string()
        .describe("Search Query.")
        .optional(),
    country: z.string()
        .describe(
            "Country to use. 🇺🇸 United States by default. Accepts one of 127 values; list them with GET https://api.mindcase.co/v1/data/ubereats/stores?expand=options.",
        )
        .optional(),
    storeType: z.enum([
        "ALL",
        "RESTAURANTS",
        "GROCERY",
        "CONVENIENCE",
        "ALCOHOL",
        "PHARMACY",
        "PRESCRIPTIONS",
        "PERSONAL_CARE",
        "BABY",
        "SPECIALITY_FOODS",
        "PET_SUPPLIES",
        "FLOWERS",
        "RETAIL",
        "BEAUTY",
        "ELECTRONICS",
        "SHOP",
    ])
        .describe("Store Type to use. All categories (default) by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many stores to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
