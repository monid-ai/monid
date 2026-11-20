import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyDiscoveryQueryParams } from "./schema/inputs.ts";

/** GET /company-discovery — semantic company search, flat 3 credits. */
export default defineEndpoint({
    meta: {
        displayName: "Discover Companies by Description",
        summary: "Find listed companies that match a plain-language " +
            "description.",
        description: "Find listed companies from a plain-language " +
            "description of an industry, product, business model or " +
            "supply-chain position ('companies that make lithography " +
            "equipment for chipmaking'). Returns every candidate that " +
            "passes a model verification step, one row per company: " +
            "ticker, company_name and a short reason (at most 160 " +
            "characters) explaining the match. Covers common stock in the " +
            "US, mainland China, Japan, Hong Kong and Korea. Use it when " +
            "the ticker is unknown and only a description is available; " +
            "to resolve a name or identifier you already have, use " +
            "`/tickers`, which costs 150 times less.",
        docsUrl: "https://drillr.ai/docs/api/company-discovery",
        categories: ["equities", "company-enrichment"],
        notes: [
            "Slow: one call takes 20 seconds to a minute, because each " +
            "candidate is verified by a model.",
            "Results are not paginated or capped, and row order carries " +
            "no meaning — do not read it as relevance.",
            "Hong Kong and Korea tickers returned here are outside the " +
            "coverage of the US / China / Japan data endpoints, which " +
            "answer 404 for them.",
            "A timed-out request may still complete and be charged " +
            "upstream, and a retry starts a new one. Cache the result " +
            "rather than repeating the call.",
        ],
    },
    request: { method: "GET", path: "/company-discovery" },
    input: { schema: { queryParams: zCompanyDiscoveryQueryParams } },
    // drillr: "expect 20 seconds to a minute ... allow a 90-second read
    // timeout"
    timeouts: { requestMs: 90_000, runMs: 100_000 },
    usage: {
        /** 3 credits per call — REST card "/company-discovery 3 cr /
         *  call" (one vector search and ranking pass per request). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "semantic search",
            consumes: { credit: "default", amount: 3 },
        },
    },
});
