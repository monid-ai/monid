import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ubereats/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ubereats/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zUbereatsProductsBody = z.object({
    query: z.string()
        .describe(
            "Keyword to search for near the address, such as a dish, cuisine or restaurant name (pizza, sushi, McDonald's). Leave blank to read every store near the address.",
        )
        .optional(),
    address: z.string()
        .describe(
            "Delivery address, city or postcode to search near (for example 350 5th Ave, New York).",
        )
        .optional(),
    country: z.string()
        .describe(
            "Country the address is in, used to resolve it. 🇺🇸 United States by default. Accepts one of 127 values; list them with GET https://api.mindcase.co/v1/data/ubereats/products?expand=options.",
        )
        .optional(),
    maxStores: z.number().int().min(0)
        .describe(
            "How many stores near the address to read menus from. Every store's full menu comes back, so a few stores give many products.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "One or more Uber Eats store page URLs. Every menu item of each store comes back.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many menu items to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
