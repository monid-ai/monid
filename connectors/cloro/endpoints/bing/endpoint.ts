import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBingBody } from "./schema/inputs.ts";

// cloro's documented default, applied at the binding (D25)
const zBody = zBingBody.extend({
    pages: zBingBody.shape.pages.unwrap().default(1),
});

export default defineEndpoint({
    meta: {
        displayName: "cloro Bing Search",
        summary:
            "Scrape a Bing search result page into structured JSON, with the AI Overview on request.",
        description: "Run a Bing web search as a real user in a chosen " +
            "country, and get the result page as structured JSON: the " +
            "organic results, the ads (text ads and shopping cards), and " +
            "optionally the AI Overview (Bing's AI summary) with its " +
            "cited sources. The fields have the same shapes as in " +
            "cloro#monitor/google. Up to 10 pages per request. Use it for " +
            "rank tracking on Bing and to see which pages Bing's AI " +
            "summary cites. For Bing AI Mode use cloro#monitor/bing/aimode.",
        docsUrl: "https://cloro.dev/docs/api-reference/endpoint/monitor-bing",
        categories: ["web-search", "seo", "geo"],
        notes: [
            "Billing: 5 credits per request (3 base + 2 sync surcharge), " +
            "plus 2 credits per page after the first, plus 2 credits for " +
            "the AI Overview add-on (aioverview).",
        ],
    },
    request: { method: "POST", path: "/monitor/bing" },
    input: { schema: { body: zBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    description: "3 base credits + 2 sync surcharge; " +
                        "includes the first page",
                    consumes: { credit: "default", amount: 5 },
                },
                extra_page: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "extra pages",
                    description: "result pages after the first",
                    consumes: { credit: "default", amount: 2 },
                },
                ai_overview: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "AI Overview",
                    description: "AI Overview add-on (aioverview)",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        /** cloro charges the add-on when aioverview is true or an object. */
        estimate: ({ data }) => {
            const pages = data.input.body.pages;
            const aioverview = data.input.body.include?.aioverview;
            return {
                counts: {
                    ...(pages > 1 ? { extra_page: pages - 1 } : {}),
                    ...(aioverview !== undefined && aioverview !== false
                        ? { ai_overview: 1 }
                        : {}),
                },
            };
        },
        evidence: ({ data }) => {
            const pages = data.input.body.pages;
            const aioverview = data.input.body.include?.aioverview;
            return {
                counts: {
                    ...(pages > 1 ? { extra_page: pages - 1 } : {}),
                    ...(aioverview !== undefined && aioverview !== false
                        ? { ai_overview: 1 }
                        : {}),
                },
            };
        },
    },
});
