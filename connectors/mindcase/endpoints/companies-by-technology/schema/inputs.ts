import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `companies/by-technology` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/companies/by-technology). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCompaniesByTechnologyBody = z.object({
    technologies: z.array(z.string())
        .describe(
            "Websites using ALL of these technologies, e.g. Shopify + HubSpot. Any capitalisation works.",
        )
        .optional(),
    categories: z.array(z.string())
        .describe(
            "Websites using at least one tool in EACH chosen category, e.g. Live chat. Combine with Technologies to narrow further: Shopify + Live chat = Shopify stores running a live-chat tool. Send the id or the name; all 108 via ?expand=full. Accepts one of 108 values; list them with GET https://api.mindcase.co/v1/data/companies/by-technology?expand=options.",
        )
        .optional(),
    country: z.string()
        .describe(
            "Only websites registered in this country, e.g. United Kingdom. Leave blank for every country. Accepts one of 249 values; list them with GET https://api.mindcase.co/v1/data/companies/by-technology?expand=options.",
        )
        .optional(),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many domains to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
