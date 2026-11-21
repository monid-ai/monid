import { defineEndpoint } from "@shared/core";
import { zClawifiSearchFreeBody } from "./schema/inputs.ts";

/**
 * `POST /search/free` — multi-engine web search.
 *
 * Chosen over `POST /search` and `POST /search/web` because those answer a
 * JSON ARRAY, and Clawifi only adds `credits_charged` to a JSON OBJECT body;
 * `/search/free` answers an object, so the vendor's own meter reaches the
 * provider `consolidate`.
 *
 * Usage falls back to the provider's flat PER_CALL 1: every 2xx search
 * costs one credit, with or without results (Clawifi settles the route's
 * minimum). When every engine asked is rate limited the vendor answers 429,
 * which the engine zero-bills.
 */
export default defineEndpoint({
    meta: {
        displayName: "Clawifi Search",
        summary: "Search the web through several engines, with source, " +
            "snippet and date per result.",
        description: "Search the web and get ranked results with title, " +
            "URL, snippet, the engine that returned each row, and " +
            "`published_at` / `modified_at` when the engine gives a date. " +
            "The default plan ('free_auto') tries general engines in turn " +
            "and stops at the first with results; 'free_fused' asks them at " +
            "once and merges the rows; or name one engine, including the " +
            "Hacker News, Stack Exchange, GDELT news and Hugging Face " +
            "verticals. Filter by included or excluded domains, time range " +
            "(day/week/month/year), country and language; " +
            "`filters_applied` says how each engine applied each filter, " +
            "and an engine that cannot honour a filter is skipped rather " +
            "than returning off-target rows. Results are links and " +
            "snippets only: pass a result URL to Clawifi /fetch for the " +
            "page as markdown, or with `query` for just the passages that " +
            "answer a question.",
        docsUrl: "https://clawifi.dev/docs",
        categories: ["web-search"],
        notes: [
            "One credit per search, including a search that finds nothing " +
            "(`success: true, result_count: 0`).",
            "When an engine is rate limited, 'free_auto' and 'free_fused' " +
            "move to the next one and list the skipped engines in " +
            "`rate_limited`; only when every engine asked is limited does " +
            "the call answer 429 with Retry-After.",
        ],
    },
    request: { method: "POST", path: "/search/free" },
    input: { schema: { body: zClawifiSearchFreeBody } },
});
