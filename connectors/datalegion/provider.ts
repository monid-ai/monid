import { defineProvider } from "@shared/core";
import { z } from "zod";

/**
 * Data Legion — person and company enrichment over two synchronous POST
 * routes. Four person and two company access variants use separate keys;
 * each endpoint selects and injects its own credential as `API-Key`.
 *
 * The Pay-As-You-Go contract prices successful matched calls in USD.
 * RESULT is binary: one or more matches charge once, an empty response
 * charges nothing. The engine zero-bills non-2xx responses. Rates live
 * on the endpoints; the raw vendor response is preserved.
 */
export default defineProvider({
    name: "datalegion",
    meta: {
        displayName: "Data Legion",
        summary: "Person and company enrichment with base and premium access.",
        description: "Enrich person and company records from identifiers, " +
            "with four person access variants (base/premium, with/without " +
            "PII) and two company access variants (base/premium).",
        homepageUrl: "https://www.datalegion.ai",
        docsUrl: "https://www.datalegion.ai/docs/api-reference/overview",
        categories: ["people-enrichment", "company-enrichment"],
    },
    auth: {
        // Endpoint overrides narrow this schema to the variant's credential.
        credentials: z.object({
            personBaseNoPiiApiKey: z.string().min(1).describe(
                "PERSON BASE (NO PII): /person/enrich",
            ),
            personBasePiiApiKey: z.string().min(1).describe(
                "PERSON BASE (PII): /person/enrich",
            ),
            personPremiumNoPiiApiKey: z.string().min(1).describe(
                "PERSON PREMIUM (NO PII): /person/enrich",
            ),
            personPremiumPiiApiKey: z.string().min(1).describe(
                "PERSON PREMIUM (PII): /person/enrich",
            ),
            companyBaseApiKey: z.string().min(1).describe(
                "COMPANY BASE: /company/enrich",
            ),
            companyPremiumApiKey: z.string().min(1).describe(
                "COMPANY PREMIUM: /company/enrich",
            ),
        }),
    },

    request: { baseUrl: "https://api.datalegion.ai" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
        evidence: ({ data, utils }) => {
            const matches = utils.json.len(data.output, "$.matches");
            return { counts: { RESULT: matches > 0 ? 1 : 0 } };
        },
    },
});
