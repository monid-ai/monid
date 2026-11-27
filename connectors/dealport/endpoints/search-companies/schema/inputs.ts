import { z } from "zod";
import { companyScalarFilterShape } from "../../../schema/common.ts";

/**
 * `GET /api/v1/companies` query parameters mirror
 * (https://app.dealport.com/openapi/v1.json). Optionality only.
 */
export const zSearchCompaniesQueryParams = z.object({
    ...companyScalarFilterShape,
    preview: z.boolean().describe(
        "Run a $0.00 market sizing preview instead of unlocking company Records.",
    ).optional(),
    counties: z.string().min(1).describe(
        "Comma-separated county names within `state`.",
    ).optional(),
    cities: z.string().min(1).describe(
        "Comma-separated city names within `state`.",
    ).optional(),
    markets: z.string().min(1).describe(
        "Additional state and county markets (e.g. 'IN|MI:Wayne,Oakland').",
    ).optional(),
    naics: z.string().min(2).describe(
        "Comma-separated 2-to-6 digit NAICS industry codes (e.g. '238220,332710').",
    ).optional(),
    care_types: z.string().min(1).describe(
        "Comma-separated NPI healthcare organization care types.",
    ).optional(),
    sells: z.string().min(1).describe(
        "Comma-separated online store product categories.",
    ).optional(),
    store_words: z.string().min(1).describe(
        "Storefront full-text search terms.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "Pagination offset cursor returned as `next_cursor` from the prior page.",
    ).optional(),
}).strict();
