import { z } from "zod";
import {
    companyScalarFilterShape,
    zUsStateCode,
} from "../../../schema/common.ts";

/**
 * `POST /api/v1/companies/preview` request body mirror (`CompanyFilterBody`,
 * https://app.dealport.com/openapi/v1.json). Optionality only.
 */
export const zPreviewCompaniesBody = z.object({
    ...companyScalarFilterShape,
    counties: z.array(z.string().min(1)).describe(
        "County names within `state`.",
    ).optional(),
    cities: z.array(z.string().min(1)).describe(
        "City names within `state`.",
    ).optional(),
    markets: z.array(
        z.object({
            state: zUsStateCode.describe("Two-letter US state code."),
            counties: z.array(z.string().min(1)).describe(
                "Optional county names within that state.",
            ).optional(),
        }).strict(),
    ).describe(
        "Additional state and county markets to combine in one buy-box filter.",
    ).optional(),
    naics: z.union([
        z.array(z.string().regex(/^\d{2,6}$/)).min(1),
        z.string().min(2),
    ]).describe(
        "2-to-6 digit NAICS industry codes (array or comma-separated string, e.g. ['238220']).",
    ).optional(),
    care_types: z.array(z.string().min(1)).describe(
        "NPI healthcare organization care types.",
    ).optional(),
    sells: z.array(z.string().min(1)).describe(
        "Online store product categories.",
    ).optional(),
    store_words: z.array(z.string().min(1)).describe(
        "Storefront full-text search terms.",
    ).optional(),
    offset: z.number().int().min(0).describe(
        "Result offset (default 0).",
    ).optional(),
}).strict();
