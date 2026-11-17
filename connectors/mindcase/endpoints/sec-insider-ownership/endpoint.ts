import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSecInsiderOwnershipBody } from "./schema/inputs.ts";

/**
 * Mindcase `sec/insider-ownership`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "SEC Insider Ownership",
        summary: "SEC insider ownership filings with form type, filing date, " +
            "transaction date and issuer. Pass US tickers (SEC filers " +
            "only).",
        description:
            "SEC insider ownership filings with form type, filing date, " +
            "transaction date and issuer. Pass US tickers (SEC filers " +
            "only). Returns one row per filing with transactionId, " +
            "accessionNumber, formType, filingDate, transactionDate, " +
            "issuerName, issuerTicker, issuerCik, insiderName, " +
            "insiderTitle, isDirector, isOfficer, isTenPercentOwner, " +
            "securityTitle, transactionCode, transactionLabel, " +
            "acquiredDisposed, shares, pricePerShare, transactionValue, " +
            "sharesOwnedAfter, ownershipType, isDerivative, filingUrl. " +
            "For Form 4 buy and sell transactions use " +
            "mindcase#sec/insider-trades; for 5%+ holders use " +
            "mindcase#sec/beneficial-ownership. $0.0105 per filing; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/sec/insider-ownership",
        categories: ["equities"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/sec/insider-ownership",
    request: { method: "POST", path: "/v1/data/sec/insider-ownership/run" },
    input: {
        schema: {
            body: zSecInsiderOwnershipBody.extend({
                maxResults: zSecInsiderOwnershipBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many filings to return in total.",
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
