import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zListGenerateBody } from "./schema/inputs.ts";

/** POST /v1/list/generate/companies — screen companies by structured
 *  filters. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company List Generation",
        summary: "A list of companies matching industry, location, and " +
            "funding filters.",
        description: "Build a targeted company list from structured " +
            "filters across industry, headquarters or office location, " +
            "founded year, company type, ownership, funding, investors, " +
            "revenue and valuation bands, B2B/B2C, go-to-market motion, " +
            "revenue model, AI maturity, customers, partnerships, and " +
            "markets served, with optional per-company enrichment sections. " +
            "Get the valid filter keys from the Filters List endpoint, " +
            "their allowed values from Filter Options, and industry codes " +
            "from Industry Search.",
        docsUrl: "https://agent-docs.akta.pro/api-reference/listgen-api",
        categories: ["company-enrichment"],
        notes: [
            "Billed at 1.5 credits per call plus 0.2 credits per company " +
            "returned.",
        ],
    },
    request: { method: "POST", path: "/v1/list/generate/companies/" },
    // `limit` REQUIRED at the binding (design D25): it caps the
    // per-company line, so the caller states it.
    input: {
        schema: { body: zListGenerateBody.required({ limit: true }) },
    },
    usage: {
        /** COMPOSITE: "1.5 + (0.2 × companies returned)" (agent-docs
         *  pricing, "List Generation"). Settle is inherited: the provider
         *  evidence counts the delivered `data` array under the sole
         *  metered line, and the provider consolidate lifts the claim. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                request: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    consumes: { credit: "default", amount: 1.5 },
                },
                company: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "companies",
                    consumes: { credit: "default", amount: 0.2 },
                },
            },
        },
        estimate: ({ data }) => ({
            counts: { "company": data.input.body.limit },
        }),
    },
});
