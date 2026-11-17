import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSecBeneficialOwnershipBody } from "./schema/inputs.ts";

/**
 * Mindcase `sec/beneficial-ownership`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "SEC Beneficial Ownership",
        summary: "SEC Schedule 13D and 13G beneficial ownership filings with " +
            "issuer name, CIK, CUSIP and securities class. Pass US " +
            "tickers (SEC filers only).",
        description:
            "SEC Schedule 13D and 13G beneficial ownership filings with " +
            "issuer name, CIK, CUSIP and securities class. Pass US " +
            "tickers (SEC filers only). Returns one row per filing with " +
            "accessionNumber, ticker, issuerName, issuerCik, issuerCusip, " +
            "securitiesClass, scheduleType, isAmendment, filerName, " +
            "filerType, sharesOwned, percentOfClass, soleVotingPower, " +
            "sharedVotingPower, eventDate, filingDate, purpose, " +
            "sourceOfFunds, recentTransactions, agreements, rule13d1, " +
            "reportingPersonCount, reportingPersons, filingUrl, " +
            "documentUrl. For officer and director trades use " +
            "mindcase#sec/insider-trades; for the full filing index use " +
            "mindcase#sec/filings. $0.01 per filing; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/sec/beneficial-ownership",
        categories: ["equities", "government-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/sec/beneficial-ownership",
    request: { method: "POST", path: "/v1/data/sec/beneficial-ownership/run" },
    input: {
        schema: {
            body: zSecBeneficialOwnershipBody.extend({
                maxResults: zSecBeneficialOwnershipBody.shape.maxResults
                    .unwrap().min(1).default(10).describe(
                        "How many filings to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
