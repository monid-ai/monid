import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNewsBody } from "./schema/inputs.ts";

/**
 * `POST /news` — the dedicated news vertical (Google, Bing, DuckDuckGo,
 * Yahoo, Hacker News, Reuters).
 *
 * Vendor rate card (https://s1.dev/pricing, verified 2026-09-17): 1 credit
 * per call, PLUS 1 credit per successfully crawled page when
 * `crawl_results > 0` ("Deep Search") — same COMPOSITE as `search`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search1API News",
        summary: "Search current news coverage across six backends.",
        description: "Search current news and get ranked articles " +
            "({title, link, snippet}). `search_service` picks the news " +
            "backend — Google, Bing (the vendor default), DuckDuckGo, " +
            "Yahoo, Hacker News, or Reuters. `time_range` " +
            "(day/week/month/year) is the right filter for 'latest' " +
            "questions; `include_sites` / `exclude_sites` shape the " +
            "outlets. `crawl_results` retrieves full article text for " +
            "the top results in the same call (+1 credit per crawled " +
            "page); for one article's full text, use `search1api#crawl`.",
        docsUrl: "https://docs.s1.dev/api-reference/news",
        categories: ["news-search"],
        notes: [
            "1 Search1API credit per call; `crawl_results > 0` adds 1 " +
            "credit per successfully crawled page.",
        ],
    },
    request: { method: "POST", path: "/news" },
    input: { schema: { body: zNewsBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 1 },
                    label: "news calls",
                    description: "one /news call",
                },
                crawled_page: {
                    kind: UsageModelKind.PER_UNIT,
                    consumes: { credit: "default", amount: 1 },
                    unit: Unit.PAGE,
                    label: "crawled pages",
                    description:
                        "deep-search page retrievals (crawl_results > 0)",
                },
            },
        },
        /** Worst case: the requested `crawl_results`, capped by the number
         *  of results a page can return (vendor max_results default 5). */
        estimate: ({ data }) => {
            const want = data.input.body.crawl_results ?? 0;
            const max = data.input.body.max_results ?? 5;
            const n = Math.min(want, max);
            return { counts: n > 0 ? { crawled_page: n } : {} };
        },
        /** The bill counts SUCCESSFUL crawls — results that came back
         *  carrying a `content` field. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(data.output, "$.results");
            const n = Array.isArray(results)
                ? results.filter((r) =>
                    typeof r === "object" && r !== null &&
                    typeof (r as Record<string, unknown>).content ===
                        "string" &&
                    ((r as Record<string, unknown>).content as string)
                            .length > 0
                ).length
                : 0;
            return { counts: n > 0 ? { crawled_page: n } : {} };
        },
    },
});
