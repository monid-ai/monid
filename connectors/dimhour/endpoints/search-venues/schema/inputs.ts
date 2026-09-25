import { z } from "zod";

/** Faithful mirror of the live `search_venues` inputSchema (Dim Hour MCP
 *  tools/list, 2026-09-24): optionality and the source's own bounds only,
 *  no defaults (design D25). */
export const zSearchVenuesBody = z.strictObject({
    city: z.string().describe(
        "City name or key, e.g. 'NYC', 'dallas'. OMIT to search ALL cities at once.",
    ).optional(),
    query: z.string().describe(
        "Free text; every content word must appear in name, cuisine, neighborhood, tags, dishes, or description (filler like 'best'/'tonight' is ignored). One strong keyword beats a full sentence.",
    ).optional(),
    neighborhood: z.string().describe(
        "Filter to a neighborhood (substring match)",
    ).optional(),
    cuisine: z.string().describe("Filter to a cuisine (substring match)")
        .optional(),
    max_price: z.number().int().min(1).max(4).describe(
        "Max price tier 1-4 ($-$$$$)",
    ).optional(),
    min_score: z.number().min(0).max(100).describe(
        "Minimum quality score 0-100",
    ).optional(),
    happy_hour_only: z.boolean().describe("Only venues with happy hour info")
        .optional(),
    awards_contains: z.string().describe(
        "Only venues whose awards field matches, e.g. 'michelin', 'james beard', 'bib gourmand'",
    ).optional(),
    iconic_only: z.boolean().describe(
        "Only 'Iconic 50' venues (NYC has these today)",
    ).optional(),
    trending_only: z.boolean().describe("Only trending venues").optional(),
    limit: z.number().int().min(1).max(25).describe("Max results, default 10")
        .optional(),
    sort: z.enum(["score_desc", "score_asc", "name_asc"]).describe(
        "Result order. Default score_desc (highest quality first).",
    ).optional(),
    fields: z.array(z.string()).describe(
        "Return only these fields on each venue, to keep a result small. `id`, `name` and `url` are always included — `url` is the citation link.",
    ).optional(),
});
