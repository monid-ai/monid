import { z } from "zod";
import { zSection } from "../../../schema/common.ts";

/** Akta POST /v1/list/generate/companies body (agent-docs OpenAPI,
 *  2026-10-21). `filters` is an open object on the vendor side
 *  (`additionalProperties: true`); its keys come from the Filters List
 *  endpoint. */
export const zListGenerateBody = z.object({
    filters: z.record(z.string(), z.unknown()).describe(
        "Structured filter conditions, keyed by the filter keys the " +
            "Filters List endpoint returns (e.g. 'industry.industry' with " +
            "codes from the Industry Search endpoint). Allowed values for a " +
            "key come from the Filter Options endpoint; pass keys and values " +
            "verbatim.",
    ),
    sections: z.array(zSection).optional().describe(
        "Enrichment sections to include for each company: firmographic, " +
            "business_model, company_assessment, trust_signal, " +
            "company_hierarchy, digital_presence, financial_estimate, " +
            "location, management_profile, product_offering, " +
            "strategic_signal, customer_profile, industry, technology, " +
            "funding_detail, mna_and_investment.",
    ),
    sort_by: z.enum([
        "relevance",
        "revenue_estimate",
        "valuation_estimate",
        "employee_range",
        "total_funding",
        "founded_year",
    ]).optional().describe("Field to sort results by. Default relevance."),
    sort_order: z.enum(["asc", "desc"]).optional().describe(
        "Sort direction. Default desc.",
    ),
    limit: z.number().int().min(1).max(500).optional().describe(
        "Maximum companies to return. Default 50, max 500.",
    ),
    offset: z.number().int().min(0).optional().describe(
        "Number of results to skip for pagination. Default 0.",
    ),
});
