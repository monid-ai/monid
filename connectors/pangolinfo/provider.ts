import { defineProvider, presets } from "@shared/core";

/**
 * Native points, verified 2026-10-29. Public rate sources:
 * https://docs.pangolinfo.com/en-api-reference/amazonApi/submit (JSON: 1)
 * https://docs.pangolinfo.com/en-api-reference/amazonReviewAPI/amazonReviewAPI (5/page)
 * https://docs.pangolinfo.com/en-api-reference/amazonAlexaAPI/amazonAlexaAPI (6/turn)
 * https://docs.pangolinfo.com/en-api-reference/mapDataApi/mapDataAPI (1.5/call)
 * Hosted point-to-USD conversion is a separate account agreement.
 */
export default defineProvider({
    name: "pangolinfo",
    meta: {
        displayName: "Pangolinfo Scraper API",
        summary:
            "Live Amazon products, reviews, sellers, Rufus answers and local businesses.",
        description:
            "Structured Amazon product details, keyword search, category and seller listings, bestsellers, new releases and competing offers. Retrieve buyer reviews for voice-of-customer research, ask Amazon Rufus shopping questions in the US or Japan, or search Google Maps local businesses. Usage is in Pangolinfo points; prices in dollars depend on the hosted account agreement.",
        homepageUrl: "https://www.pangolinfo.com",
        docsUrl: "https://docs.pangolinfo.com",
        categories: ["amazon", "maps", "web-scraping"],
        notes: [
            "JSON only. Each call has an explicit scope; the connector never follows pagination or retries a paid result automatically.",
            "The pointCost receipt is authoritative when present. Codes 9201 (no other sellers), 9204 (missing ASIN) and 9206 (redirect) can be billed results: inspect code and message before using data, and do not retry automatically. Code 9207 is an unbilled Rufus refusal.",
            "An explicit zero pointCost also produces zero derived usage. Missing receipts fall back to the endpoint's documented units. Pricing is pinned to ScrapeApiPrices as of 2026-10-29: standard JSON page 1 point, review page 5 points, Rufus answered turn 6 points, Maps call 1.5 points.",
            "ZIP codes must belong to the marketplace country. Omission lets Pangolinfo choose a delivery ZIP code, so price and availability can vary.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://scrapeapi.pangolinfo.com" },
    timeouts: { requestMs: 270_000, runMs: 280_000 },
    usage: {
        credits: { default: { label: "Pangolinfo points" } },
        consolidate: ({ data, utils }) => {
            const cost = utils.json.optionalNum(data.output, "$.pointCost");
            return {
                credits: {
                    ...(cost !== undefined && cost >= 0
                        ? { default: cost }
                        : {}),
                },
            };
        },
        evidence: ({ data, utils }) => {
            const cost = utils.json.optionalNum(data.output, "$.pointCost");
            // Flat PER_CALL models cannot represent a waived successful call:
            // PAGE is deliberately metered so an explicit zero stays zero.
            return { counts: { PAGE: cost === 0 ? 0 : 1 } };
        },
    },
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const code = utils.json.optionalNum(res.body, "$.code");
            const cost = utils.json.optionalNum(res.body, "$.pointCost");
            // Do not erase vendor charges because a paid result has a nonzero
            // semantic code. Preserve the envelope so agents can see the outcome.
            if (
                code === 0 ||
                (code !== undefined && cost !== undefined && cost > 0)
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            let httpStatus = 502;
            if (code !== undefined && code >= 1001 && code <= 1012) {
                httpStatus = 400;
            }
            if (code === 1004 || code === 3002 || code === 3003) {
                httpStatus = 401;
            }
            if (
                code === 2001 || code === 2005 || code === 2007 || code === 2009
            ) httpStatus = 402;
            if (code === 4002 || code === 4003) httpStatus = 403;
            if (code === 4029 || code === 4030) httpStatus = 429;
            if (code === 9202 || code === 9203 || code === 9205) {
                httpStatus = 503;
            }
            if (code === 9207) httpStatus = 422;
            return {
                kind: "COMPLETED",
                httpStatus,
                providerHttpStatus: res.status,
                output: res.body,
            };
        },
    },
});
