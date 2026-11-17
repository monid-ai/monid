import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSecInsiderTradesBody } from "./schema/inputs.ts";

/**
 * Mindcase `sec/insider-trades`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "SEC Insider Trades",
        summary:
            "SEC Form 4 insider trades with filing URL, form type, filing " +
            "date and issuer. Pass US tickers (SEC filers only) or filter " +
            "by transaction code.",
        description:
            "SEC Form 4 insider trades with filing URL, form type, filing " +
            "date and issuer. Pass US tickers (SEC filers only) or filter " +
            "by transaction code. Returns one row per trade with " +
            "transactionId, accessionNumber, filingUrl, formType, " +
            "filingDate, issuerTicker, issuerName, issuerCik, " +
            "insiderName, insiderRole, isDirector, isOfficer, " +
            "isTenPercentOwner, transactionDate, transactionCode, " +
            "transactionType, securityTitle, isDerivative, " +
            "acquiredDisposed, shares, pricePerShare, transactionValue, " +
            "sharesOwnedAfter, ownershipType. For insider holdings " +
            "filings (Forms 3 and 5) use mindcase#sec/insider-ownership; " +
            "for 5%+ holders use mindcase#sec/beneficial-ownership; for " +
            "trades by members of Congress use mindcase#congress/trades. " +
            "$0.0105 per trade; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/sec/insider-trades",
        categories: ["equities"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/sec/insider-trades",
    request: { method: "POST", path: "/v1/data/sec/insider-trades/run" },
    input: {
        schema: {
            body: zSecInsiderTradesBody.extend({
                maxResults: zSecInsiderTradesBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe("How many trades to return in total."),
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
