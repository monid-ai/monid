import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGooglePatentsPatentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `google-patents/patents`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Patents",
        summary:
            "Patents from Google Patents with title, abstract, assignees, " +
            "inventors, priority date and filing date. Search by keyword.",
        description:
            "Patents from Google Patents with title, abstract, assignees, " +
            "inventors, priority date and filing date. Search by keyword. " +
            "Returns one row per patent with publicationNumber, title, " +
            "abstract, assignees, inventors, priorityDate, filingDate, " +
            "publicationDate, grantDate, status, applicationNumber, " +
            "language, cpcCodes, claimsCount, patentCitations, " +
            "nonPatentCitations, citedBy, figureCount, pdfUrl, patentUrl. " +
            "$0.0105 per patent; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google-patents/patents",
        categories: ["legal-research"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google-patents/patents",
    request: { method: "POST", path: "/v1/data/google-patents/patents/run" },
    input: {
        schema: {
            body: zGooglePatentsPatentsBody.extend({
                maxResults: zGooglePatentsPatentsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many patents to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0105 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
