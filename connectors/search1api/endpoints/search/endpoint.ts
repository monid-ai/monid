import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchBody } from "./schema/inputs.ts";

/**
 * `POST /search` — web search across Google, Bing, DuckDuckGo, Yahoo,
 * YouTube, X, Reddit, GitHub, arXiv, WeChat, Bilibili, IMDb, Wikipedia and
 * the Chinese engines (Sogou, Baidu, 360, Quark).
 *
 * Flat 1 credit per call ⇒ leaf PER_CALL; quantities fns synthesized.
 * `crawl_results` folds full-page retrieval into the same call at no extra
 * charge — worth naming in the description since it changes what an agent
 * reaches for next.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search1API Web Search",
        summary: "Search the live web across 17 backends, with optional " +
            "full-page retrieval in the same call.",
        description: "Search the live web and get ranked results " +
            "({title, link, snippet}). `search_service` picks the " +
            "backend — Google, Bing, DuckDuckGo, Yahoo, YouTube, X, " +
            "Reddit, GitHub, arXiv, WeChat, Bilibili, IMDb, Wikipedia, or " +
            "the Chinese engines (Sogou, Baidu, 360, Quark); omit it for " +
            "the vendor default. `time_range` filters to a freshness " +
            "window (day/week/month/year) and `include_sites` / " +
            "`exclude_sites` shape the domains. Set `crawl_results` to " +
            "also fetch the top results' full page content in the same " +
            "call — free under the flat per-call price — or pipe a " +
            "chosen URL to `search1api#crawl` for clean Markdown.",
        docsUrl: "https://docs.s1.dev/api-reference/search",
        categories: ["web-search"],
        notes: [
            "1 Search1API credit per call, whatever the parameters.",
            "The API also accepts a batch array (one credit per item); " +
            "this connector exposes the single-object form.",
        ],
    },
    request: { method: "POST", path: "/search" },
    input: { schema: { body: zSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "search calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
