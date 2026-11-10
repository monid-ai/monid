import { defineProvider, presets, Unit, UsageModelKind } from "@shared/core";

export const tavilyUsageModel = {
    kind: UsageModelKind.PER_UNIT,
    unit: Unit.CREDIT,
    consumes: { credit: "default", amount: 1 },
    label: "API credits",
} as const;

export default defineProvider({
    name: "tavily",
    meta: {
        displayName: "Tavily",
        summary:
            "Web search, extraction, crawling, mapping and research for AI agents.",
        description:
            "Search the web for relevant sources, extract content from known " +
            "URLs, crawl a website for page content, map its links, or run " +
            "multi-source research with citations. Responses " +
            "preserve Tavily's native results and metadata.",
        homepageUrl: "https://tavily.com",
        docsUrl: "https://docs.tavily.com",
        categories: ["web-search", "web-scraping"],
        notes: [
            "Usage is measured in Tavily API credits, not US dollars. Billable runs request native usage receipts.",
            "Extract, Crawl and Map can report zero credits before account-level billing thresholds are reached. Settlement uses the native receipt; admission estimates may differ.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://api.tavily.com",
        headers: { "X-Client-Name": "monid" },
    },
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    input: {
        toRequest: ({ data, utils }) => ({
            ...data.input,
            // A caller's legacy body key must not bypass transport credentials.
            body: utils.json.merge(
                utils.json.pluck(data.input.body ?? {}, "$.api_key").rest,
                { include_usage: true },
            ),
        }),
    },
    usage: {
        credits: { default: { label: "Tavily API credits" } },
        // Native credit accumulation crosses request boundaries for extract/map.
        // A per-response page-block fold would overcharge zero-credit receipts.
        // Source: https://docs.tavily.com/documentation/api-credits (2026-10-26).
        model: tavilyUsageModel,
        evidence: ({ data, utils }) => {
            const credits = utils.json.num(data.output, "$.usage.credits");
            if (credits < 0) {
                throw new Error(
                    "Tavily usage.credits must be nonnegative",
                );
            }
            return { counts: { ...(credits > 0 ? { CREDIT: credits } : {}) } };
        },
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(data.output, "$.usage");
            if (value === undefined) {
                throw new Error("Tavily response lacks usage");
            }
            return {
                credits: { default: utils.json.num(value, "$.credits") },
                output: rest,
            };
        },
    },
});
