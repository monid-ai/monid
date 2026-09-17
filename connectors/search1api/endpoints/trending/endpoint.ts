import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTrendingBody } from "./schema/inputs.ts";

/**
 * `POST /trending` — what's hot on GitHub or Hacker News right now.
 * Flat 1 credit per call ⇒ leaf PER_CALL.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search1API Trending",
        summary: "Trending GitHub repositories or Hacker News stories.",
        description: "Get the current trending list from one source: " +
            "`search_service: 'github'` returns trending repositories, " +
            "'hackernews' returns trending stories — each " +
            "{title, url, description}. A discovery surface, not a " +
            "search: for a specific topic use `search1api#search`.",
        docsUrl: "https://docs.s1.dev/api-reference/trending",
        categories: ["web-search"],
        notes: ["1 Search1API credit per call."],
    },
    request: { method: "POST", path: "/trending" },
    input: { schema: { body: zTrendingBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "trending calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
