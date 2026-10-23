import { z } from "zod";
import { zDomain } from "../../../schema/common.ts";

/** Bloomberry GET /enrichments/tech.json query params — the faithful
 *  vendor mirror (docs.bloomberry.com/reference/get_enrichments-tech-json). */
export const zTechStackQueryParams = z.object({
    domain: zDomain.describe(
        "The company's website domain, bare (e.g. 'unifygtm.com').",
    ),
    list_mode: z.boolean().optional().describe(
        "true returns the vendor names as one comma-separated string (for " +
            "spreadsheet-style tools) instead of the structured `vendors` " +
            "array. Default false. Leave it off to get categories, URLs " +
            "and usage start dates.",
    ),
    category: z.string().min(1).optional().describe(
        "Only return vendors in this category (e.g. 'customer relationship " +
            "management'). Valid values: https://api.revealera.com/categories.txt",
    ),
    upper_level_category: z.string().min(1).optional().describe(
        "Only return vendors in this upper-level category (e.g. 'Customer " +
            "Experience & Support').",
    ),
});
