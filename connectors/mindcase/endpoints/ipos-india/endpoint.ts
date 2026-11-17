import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zIposIndiaBody } from "./schema/inputs.ts";

/**
 * Mindcase `ipos/india`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "IPOs India",
        summary:
            "Indian IPOs with name, category, exchange, status and issue " +
            "price, for the mainboard, SME or both.",
        description:
            "Indian IPOs with name, category, exchange, status and issue " +
            "price, for the mainboard, SME or both. Returns one row per " +
            "IPO with slug, ipoName, category, exchange, status, " +
            "statusText, issuePrice, lotSize, issueSizeCr, " +
            "priceToEarnings, openDate, closeDate, allotmentDate, " +
            "listingDate, gmp, gmpPercent, gmpUpdatedOn, " +
            "subscriptionTotal, anchorInvestors, url. $0.0045 per IPO; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ipos/india",
        categories: ["equities"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ipos/india",
    request: { method: "POST", path: "/v1/data/ipos/india/run" },
    input: {
        schema: {
            body: zIposIndiaBody.extend({
                maxResults: zIposIndiaBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe("How many IPOs to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0045 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
