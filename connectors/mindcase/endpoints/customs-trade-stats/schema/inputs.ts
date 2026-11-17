import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `customs/trade-stats` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/customs/trade-stats). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCustomsTradeStatsBody = z.object({
    groupBy: z.enum(["hsCode", "originCountry", "destinationCountry", "period"])
        .describe(
            "How to bucket matching trade records: by HS code, origin country, destination country, or time period.",
        )
        .optional(),
    direction: z.enum(["imports", "exports"])
        .describe("Whether to aggregate import records or export records.")
        .optional(),
    product: z.array(z.string())
        .describe(
            "Product description keywords to match; one of product, HS code, importer or exporter is required.",
        )
        .optional(),
    hsCode: z.string()
        .describe(
            "A customs HS code of 4 or more digits (a 2-digit chapter code needs another filter alongside it).",
        )
        .optional(),
    importer: z.string()
        .describe("An importing company name to filter records by.")
        .optional(),
    exporter: z.string()
        .describe("An exporting company name to filter records by.")
        .optional(),
    originCountry: z.array(z.string())
        .describe(
            "Restrict to these origin countries, as ISO 3166 alpha-3 codes (e.g. COL, USA). Pick from the list; English country names are also accepted. Accepts one of 248 values; list them with GET https://api.mindcase.co/v1/data/customs/trade-stats?expand=options.",
        )
        .optional(),
    destinationCountry: z.array(z.string())
        .describe(
            "Restrict to these destination countries, as ISO 3166 alpha-3 codes (e.g. COL, USA). Pick from the list; English country names are also accepted. Accepts one of 248 values; list them with GET https://api.mindcase.co/v1/data/customs/trade-stats?expand=options.",
        )
        .optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Start of the query window, defaults to one year before the end date. Format YYYY-MM-DD.",
        )
        .optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "End of the query window, defaults to today. Format YYYY-MM-DD.",
        )
        .optional(),
    periodUnit: z.enum(["months", "quarters", "years"])
        .describe("Bucket size used only when grouping by time period.")
        .optional(),
    maxResults: z.number().int().max(100)
        .describe(
            "How many aggregate buckets to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
