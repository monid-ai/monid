import { z } from "zod";
import { zCompany, zSection } from "../../../schema/common.ts";

/** Akta /v1/company/enrichment/markdown query params (agent-docs OpenAPI,
 *  2026-10-21). `sections` is one comma-separated string on the wire; the
 *  mirror keeps it an ARRAY, like enrichment, and the provider toRequest
 *  joins it. */
export const zMarkdownQueryParams = z.object({
    company: zCompany,
    sections: z.array(zSection).min(1).describe(
        "Sections to render into the Markdown document (comma-separated " +
            "query param). Required. To get every section, list all of " +
            "them. " +
            "Available: firmographic, business_model, company_assessment, " +
            "trust_signal, company_hierarchy, digital_presence, " +
            "financial_estimate, location, management_profile, " +
            "product_offering, strategic_signal, customer_profile, " +
            "industry, technology, funding_detail, mna_and_investment. The " +
            "last two bill at premium per-section rates (3 and 5 credits).",
    ).optional(),
}).strict();
