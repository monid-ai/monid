import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchCompaniesBody } from "./schema/inputs.ts";

/**
 * `POST /companies/search` — find companies by a sentence or by filters.
 *
 * SYNC and paged like the people search: the opaque
 * `pagination.nextCursor` passes through untouched.
 *
 * BILLED PER ROW RETURNED. outbound.dev charges $0.001 per company on the
 * page, so the evidence counts `data`; the estimate is the page size.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Target Companies",
        summary:
            "Find companies by industry, headcount, location, funding stage or technology, from filters or a plain-English description.",
        description: "Find companies by industry, headcount, headquarters, " +
            "funding stage or technology. Send a plain-English `query`, such " +
            'as "logistics companies in Portugal", or `filters`. Each ' +
            "company has its name, website domains, LinkedIn page, " +
            "industries, headcount range, headquarters and funding stage, " +
            "up to 100 a page, and an empty page costs nothing. The answer " +
            "carries `data` (the companies), `filters` (the filters the " +
            "search ran with) and `pagination.nextCursor`: send it back as " +
            "`cursor` with those `filters` for the next page; it is absent " +
            "on the last page. Pair it with `outbound-dev#companies/people` " +
            "(Find Decision Makers) to get the people at each company. Size " +
            "a search for free first with `outbound-dev#companies/count`.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/companies/search-companies",
        categories: ["company-enrichment"],
        notes: [
            "Send exactly one of `query` or `filters`; anything else " +
            "answers 422 `validation_failed` and charges nothing.",
            "Page with the returned `filters`, not the `query`: a repeated " +
            "`query` is turned into filters again.",
        ],
    },
    request: { method: "POST", path: "/companies/search" },
    input: {
        schema: {
            body: zSearchCompaniesBody.extend({
                limit: zSearchCompaniesBody.shape.limit.unwrap().default(25),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
            label: "company",
            description: "a company returned on the page",
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.limit },
        }),
        evidence: ({ data, utils }) => ({
            counts: { RESULT: utils.json.len(data.output, "$.data") },
        }),
    },
});
