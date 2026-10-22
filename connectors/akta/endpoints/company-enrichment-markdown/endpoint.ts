import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMarkdownQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/enrichment/markdown — the enrichment sections rendered
 *  as one Markdown document. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company Enrichment (Markdown)",
        summary: "Selected company profile sections as one Markdown document.",
        description: "Get the same company data as Akta Company Enrichment, " +
            "rendered as a single Markdown string instead of nested JSON — " +
            "for output a model will read directly, insert into a prompt, " +
            "or summarize. List the sections you want in the 'sections' " +
            "filter (required — billing is per section); the response " +
            "names the sections it rendered in 'sections_included'. Funding " +
            "(funding_detail) and M&A (mna_and_investment) sections bill at " +
            "premium per-section rates.",
        docsUrl:
            "https://agent-docs.akta.pro/api-reference/company-data-markdown",
        categories: ["company-enrichment", "funding-data"],
    },
    request: { method: "GET", path: "/v1/company/enrichment/markdown/" },
    // `sections` REQUIRED AT THE BINDING (design D25), as on enrichment:
    // billing is per section, so the estimate needs the list.
    input: {
        schema: {
            queryParams: zMarkdownQueryParams.required({ sections: true }),
        },
    },
    usage: {
        /** COMPOSITE, one component per section, ids = the vendor's own
         *  section names. Rates are the CURRENT agent-docs "Company Data"
         *  table (checked 2026-10-21) — note it lists management_profile
         *  at 1 and industry at 0.5, where company-enrichment's pins say
         *  1.5 and 1. The provider consolidate's `credits_consumed` claim
         *  wins either way; a stale pin shows up as usage.mismatch.derived. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                firmographic: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 2 },
                },
                business_model: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 2 },
                },
                company_assessment: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 2 },
                },
                trust_signal: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.5 },
                },
                company_hierarchy: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.5 },
                },
                digital_presence: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.5 },
                },
                financial_estimate: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.5 },
                },
                location: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.5 },
                },
                management_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1 },
                },
                product_offering: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 2 },
                },
                strategic_signal: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1.5 },
                },
                customer_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1 },
                },
                industry: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.5 },
                },
                technology: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 2 },
                },
                funding_detail: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    description: "Premium-rate section (3 credits)",
                    consumes: { credit: "default", amount: 3 },
                },
                mna_and_investment: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    description: "Premium-rate section (5 credits)",
                    consumes: { credit: "default", amount: 5 },
                },
            },
        },
        /** One count under each requested section's component id. */
        estimate: ({ data }) => ({
            counts: Object.fromEntries(
                data.input.queryParams.sections
                    .map((section) => [section, 1]),
            ),
        }),
        /** OVERRIDES the provider's generic evidence: `data` is one
         *  Markdown string, so the delivered sections come from the
         *  response's own `sections_included` list. */
        evidence: ({ data, utils }) => {
            const included = utils.json.optionalGet(
                data.output,
                "$.sections_included",
            );
            const sections = Array.isArray(included)
                ? included.filter((section) => typeof section === "string")
                : [];
            return {
                counts: Object.fromEntries(
                    sections.map((section) => [section, 1]),
                ),
            };
        },
    },
});
