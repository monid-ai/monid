import { z } from "zod";
import { companyFilterFields, zUsStateCode } from "../../../schema/common.ts";

/**
 * `POST /api/v1/companies/preview` request body mirror (`CompanyFilterBody`,
 * https://app.dealport.com/openapi/v1.json). Optionality and OpenAPI
 * nullability only.
 */
export const zPreviewCompaniesBody = z.object({
    q: companyFilterFields.q.nullable().optional(),
    state: companyFilterFields.state.nullable().optional(),
    domain: companyFilterFields.domain.nullable().optional(),
    min_revenue: companyFilterFields.min_revenue.nullable().optional(),
    max_revenue: companyFilterFields.max_revenue.nullable().optional(),
    filed_revenue_only: companyFilterFields.filed_revenue_only.optional(),
    min_employees: companyFilterFields.min_employees.nullable().optional(),
    max_employees: companyFilterFields.max_employees.nullable().optional(),
    size_unknown: companyFilterFields.size_unknown.optional(),
    independent: companyFilterFields.independent.optional(),
    owner_businesses: companyFilterFields.owner_businesses.nullable()
        .optional(),
    medicare: companyFilterFields.medicare.optional(),
    owner_operated: companyFilterFields.owner_operated.optional(),
    owner_contact: companyFilterFields.owner_contact.optional(),
    licensed: companyFilterFields.licensed.optional(),
    adviser: companyFilterFields.adviser.optional(),
    wealth_adviser: companyFilterFields.wealth_adviser.optional(),
    online_store: companyFilterFields.online_store.optional(),
    min_reviews: companyFilterFields.min_reviews.nullable().optional(),
    order: companyFilterFields.order.nullable().optional(),
    limit: companyFilterFields.limit.optional(),
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
        z.array(z.string().regex(/^\d{2,6}$/)),
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
