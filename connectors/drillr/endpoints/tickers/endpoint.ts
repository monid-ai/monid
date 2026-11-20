import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTickersQueryParams } from "./schema/inputs.ts";

/** GET /tickers — name / code / identifier to canonical ticker, or the
 *  full list of trading common stocks in a market. */
export default defineEndpoint({
    meta: {
        displayName: "Resolve Ticker",
        summary: "Resolve a company name, ISIN, CIK or CUSIP to drillr's " +
            "canonical ticker, or list a market's stocks.",
        description: "Turn a company name, ticker, ISIN, CIK or CUSIP into " +
            "the canonical `ticker` every other drillr endpoint requires. " +
            "Returns one row per match with ticker, market (US / CN / JP), " +
            "English company name, exchange MIC (XNAS, XNYS, XASE, XSHG, " +
            "XSHE, BJSE, XTKS) and identifiers {isin, cik, cusip} — CIK " +
            "and CUSIP only for US companies. Without `query` it lists " +
            "every currently trading common stock, paged in ascending " +
            "ticker order. Call this first whenever you hold a name or an " +
            "identifier rather than a canonical ticker. Matching is exact " +
            "on the whole value, so it will not find a company from a " +
            "partial name or a description — use `/company-discovery` for " +
            "that.",
        docsUrl: "https://drillr.ai/docs/api/tickers",
        categories: ["equities", "company-enrichment"],
        notes: [
            "Coverage is common stock listed in the US, mainland China " +
            "and Japan. Hong Kong, Korea and Taiwan listings never " +
            "appear, and delisted codes do not resolve.",
            "No match is a 200 with an empty `data` array, not an error.",
            "A name can return several rows when the same company has " +
            "multiple listings; rows are in ascending ticker order, not " +
            "ranked.",
        ],
    },
    request: { method: "GET", path: "/tickers" },
    input: { schema: { queryParams: zTickersQueryParams } },
    usage: {
        /** 0.02 credits per call — the endpoint's own page states "20 cr
         *  / thousand calls" (the REST card's "all other endpoints"
         *  tier). The MCP twin `ticker_lookup` is free; this is the REST
         *  route, so the REST rate is pinned. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "lookup",
            consumes: { credit: "default", amount: 0.02 },
        },
    },
});
