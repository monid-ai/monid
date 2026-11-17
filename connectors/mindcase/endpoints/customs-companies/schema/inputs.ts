import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `customs/companies` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/customs/companies). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCustomsCompaniesBody = z.object({
    product: z.array(z.string())
        .describe(
            "Product keywords to match against customs goods descriptions.",
        )
        .optional(),
    hsCode: z.string()
        .describe(
            "Customs HS code (4 or more digits) to anchor the trade query.",
        )
        .optional(),
    direction: z.enum(["importers", "exporters"])
        .describe(
            "Which side of the trade to rank: importing companies or exporting companies.",
        )
        .optional(),
    counterpartyName: z.string()
        .describe(
            "Name of the trading partner company on the other side of the shipments, used to narrow the ranking.",
        )
        .optional(),
    originCountries: z.array(z.string())
        .describe(
            "Origin countries to filter the trade records by, as ISO 3166 alpha-3 codes (e.g. COL, USA). Pick from the list; English country names are also accepted. Accepts one of 248 values; list them with GET https://api.mindcase.co/v1/data/customs/companies?expand=options.",
        )
        .optional(),
    destinationCountries: z.array(z.string())
        .describe(
            "Destination countries to filter the trade records by, as ISO 3166 alpha-3 codes (e.g. COL, USA). Pick from the list; English country names are also accepted. Accepts one of 248 values; list them with GET https://api.mindcase.co/v1/data/customs/companies?expand=options.",
        )
        .optional(),
    maxResults: z.number().int().max(100)
        .describe(
            "How many companies to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
}).strict();
