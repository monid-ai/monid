import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNewsBody } from "./schema/inputs.ts";

/**
 * `POST /news` — the dedicated news vertical (Google, Bing, DuckDuckGo,
 * Yahoo, Hacker News, Reuters). Flat 1 credit per call ⇒ leaf PER_CALL.
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
            "outlets. `crawl_results` retrieves full article text for the " +
            "top results in the same call; for one article's full text, " +
            "use `search1api#crawl`.",
        docsUrl: "https://docs.s1.dev/api-reference/news",
        categories: ["news-search"],
        notes: ["1 Search1API credit per call."],
    },
    request: { method: "POST", path: "/news" },
    input: { schema: { body: zNewsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "news calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
