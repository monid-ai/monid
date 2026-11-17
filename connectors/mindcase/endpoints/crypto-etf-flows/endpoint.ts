import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCryptoEtfFlowsBody } from "./schema/inputs.ts";

/**
 * Mindcase `crypto/etf-flows`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Crypto ETF Flows",
        summary: "Provides daily net capital flow figures for crypto " +
            "exchange-traded funds along with a directory of individual " +
            "fund issuers, fees and assets under management.",
        description: "Provides daily net capital flow figures for crypto " +
            "exchange-traded funds along with a directory of individual " +
            "fund issuers, fees and assets under management. Returns one " +
            "row per ETF flow record with flowId, asset, date, " +
            "netFlowUsd, assetPriceUsd, settled, etfs. For token prices " +
            "and market cap use mindcase#coingecko/coins. $0.005 per ETF " +
            "flow record; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/crypto/etf-flows",
        categories: ["token-prices"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/crypto/etf-flows",
    request: { method: "POST", path: "/v1/data/crypto/etf-flows/run" },
    input: {
        schema: {
            body: zCryptoEtfFlowsBody.extend({
                maxResults: zCryptoEtfFlowsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many daily flow records to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
