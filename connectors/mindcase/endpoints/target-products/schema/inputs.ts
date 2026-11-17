import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `target/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/target/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTargetProductsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    productUrls: z.array(z.string())
        .describe("One or more product urls. One request reads them all.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    zipCode: z.string()
        .describe(
            "Optional 5-digit US zip code, for example 10001. It picks the nearest Target store for pickup stock. Pickup Availability, Pickup Store ID, Pickup Store Name, Pickup Quantity and Scheduled Delivery Availability fill only when a zip code is given; prices stay Target's online prices either way.",
        )
        .optional(),
}).strict();
