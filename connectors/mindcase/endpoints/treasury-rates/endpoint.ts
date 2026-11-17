import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTreasuryRatesBody } from "./schema/inputs.ts";

/**
 * Mindcase `treasury/rates`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "US Treasury Rates",
        summary: "US Treasury rates and debt data by date, from par and real " +
            "yield curves to bill rates, long-term rates and debt to the " +
            "penny. Pick the series and date range.",
        description:
            "US Treasury rates and debt data by date, from par and real " +
            "yield curves to bill rates, long-term rates and debt to the " +
            "penny. Pick the series and date range. Returns one row per " +
            "rate with id, series, date, par1Month, par6Week, par2Month, " +
            "par3Month, par4Month, par6Month, par1Year, par2Year, " +
            "par3Year, par5Year, par7Year, par10Year, par20Year, " +
            "par30Year, real5Year, real7Year, real10Year, real20Year, " +
            "real30Year, bill4WeekBankDiscount, " +
            "bill4WeekCouponEquivalent, bill4WeekMaturity, " +
            "bill4WeekCusip, bill6WeekBankDiscount, " +
            "bill6WeekCouponEquivalent, bill6WeekMaturity, bill6WeekCusip " +
            "and 21 more fields. $0.0015 per rate; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/treasury/rates",
        categories: ["government-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/treasury/rates",
    request: { method: "POST", path: "/v1/data/treasury/rates/run" },
    input: {
        schema: {
            body: zTreasuryRatesBody.extend({
                maxResults: zTreasuryRatesBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many rates to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0015 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
