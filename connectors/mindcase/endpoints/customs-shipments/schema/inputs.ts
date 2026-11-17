import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `customs/shipments` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/customs/shipments). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCustomsShipmentsBody = z.object({
    direction: z.enum(["imports", "exports"])
        .describe("Whether to search import or export customs records.")
        .optional(),
    product: z.array(z.string())
        .describe(
            "Product keywords to search for in the shipment goods description.",
        )
        .optional(),
    hsCode: z.string()
        .describe("Customs tariff code to filter shipments, 4 or more digits.")
        .optional(),
    importer: z.array(z.string())
        .describe("Importing company name to search for.")
        .optional(),
    exporter: z.array(z.string())
        .describe("Exporting company name to search for.")
        .optional(),
    sourceCountries: z.array(z.string())
        .describe(
            "Search only these countries' customs datasets (for example america, mexico, india); leave empty to search all of them. Some countries have several datasets, e.g. the US has america, america_ship and america_stat. Accepts one of 165 values; list them with GET https://api.mindcase.co/v1/data/customs/shipments?expand=options.",
        )
        .optional(),
    originCountry: z.array(z.string())
        .describe(
            "Origin countries to filter shipments by, as ISO 3166 alpha-3 codes (e.g. CHN, USA). Pick from the list; English country names are also accepted. Accepts one of 248 values; list them with GET https://api.mindcase.co/v1/data/customs/shipments?expand=options.",
        )
        .optional(),
    destinationCountry: z.array(z.string())
        .describe(
            "Destination countries to filter shipments by, as ISO 3166 alpha-3 codes (e.g. CHN, USA). Pick from the list; English country names are also accepted. Accepts one of 248 values; list them with GET https://api.mindcase.co/v1/data/customs/shipments?expand=options.",
        )
        .optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Earliest shipment date to include, within the last three years. Format YYYY-MM-DD.",
        )
        .optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Latest shipment date to include. Format YYYY-MM-DD.")
        .optional(),
    maxResults: z.number().int().max(500)
        .describe(
            "How many customs shipment records to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
}).strict();
