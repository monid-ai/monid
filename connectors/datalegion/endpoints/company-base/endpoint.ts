import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zCompanyEnrichBody } from "./schema/inputs.ts";

/** POST /company/enrich — Company Base access, $0.013 per matched call. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Company Base",
        summary: "Enrich a company using Company Base credentials.",
        description:
            "Resolve company identifiers to matching profiles with Company Base access. " +
            "Company enrichment access is controlled by the supplied key. " +
            "Fields and access depend on the vendor contract, not client-side redaction. " +
            "Optional limit (1-10); multiple_results requires enterprise permission. " +
            "Returns matches and total; unmatched records return 404. " +
            "This endpoint does not perform search or natural-language discovery.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/company-enrichment",
        categories: ["company-enrichment"],
    },
    // Variants share a native route but require distinct Monid identities.
    endpoint: "/company/enrich/base",
    request: { method: "POST", path: "/company/enrich" },
    auth: {
        credentials: z.object({ companyBaseApiKey: z.string().min(1) }),
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "API-Key": data.params.companyBaseApiKey,
            },
        }),
    },
    input: { schema: { body: zCompanyEnrichBody } },
    usage: {
        // Binary provider evidence excludes empty 200s; PER_CALL would bill them.
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "successful matched calls",
            description:
                "One billable outcome per successful matched call, regardless of match count; no match is free.",
            consumes: { credit: "default", amount: 0.013 },
        },
        // Reserve one call, independent of the requested match limit.
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
