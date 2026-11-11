import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zSimilarQueryParams } from "./schema/inputs.ts";

/** GET /similar — companies similar to a domain. */
export default defineEndpoint({
    meta: {
        displayName: "Find Similar Companies",
        summary: "Find companies similar to a domain, such as competitors.",
        description: "Return companies similar to a company domain or name " +
            "— competitors and lookalikes — 25 per page, each with its " +
            "website, name, and industry. When Tomba knows the domain but " +
            "has no similar companies stored, it looks them up live " +
            "(except on the Free plan). Suited for competitive analysis and " +
            "expanding a target-account list from one good customer.",
        docsUrl: "https://docs.tomba.io/api/domain#similar",
        categories: ["company-enrichment"],
        notes: [
            "limit doesn't change the page size (always 25) — it sets the " +
            "cost: 1 search credit per 10, rounded up, only when results " +
            "come back. Send the lowest value, 10.",
            "`data` is null when there are no similar companies — free.",
        ],
    },
    request: { method: "GET", path: "/similar" },
    input: {
        schema: {
            // `limit` REQUIRED at the binding (design D25): it is the
            // whole cost basis (vendor default 10)
            queryParams: z.union([
                zSimilarQueryParams.required({ domain: true, limit: true }),
                zSimilarQueryParams.required({ company: true, limit: true }),
            ]).describe("Provide domain or company, and limit."),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "requested results",
            description: "results requested with limit, billed per " +
                "started block of ten when any come back",
            every: 10,
            consumes: { credit: "search", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.queryParams.limit },
        }),
        /** Charged on the requested limit when `data[]` is non-empty. */
        evidence: ({ data, utils }) => {
            // `data` is null when there are no similar companies
            const companies = utils.json.optionalGet(data.output, "$.data");
            const found = Array.isArray(companies) ? companies.length : 0;
            const limit = data.input.queryParams?.limit;
            return {
                counts: {
                    RESULT: found > 0
                        ? (typeof limit === "number" ? limit : found)
                        : 0,
                },
            };
        },
    },
});
