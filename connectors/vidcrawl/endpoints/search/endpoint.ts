import { defineEndpoint } from "@shared/core";
import { zVidCrawlSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/search` — search videos with optional inline scraping.
 */
export default defineEndpoint({
    meta: {
        displayName: "VidCrawl Video Search",
        summary: "Search YouTube videos live or via cached index, with " +
            "optional inline transcript and storyboard scraping.",
        description: "Find up to 20 relevant YouTube videos matching a query " +
            "with metadata, durations, view counts, and thumbnails. Set " +
            "`source: 'live'` (default, 1 credit = $0.009) for fresh live " +
            "search, or `source: 'index'` (0 credits up to 1,000/day) to " +
            "query previously cached scrapes filtered optionally by `domain`. " +
            "Set `scrape: true` to attach full Layer 1 scrape payloads to " +
            "each result (+1 credit / $0.009 per scraped result). Platform " +
            "'tiktok' currently returns 422 UNSUPPORTED_PLATFORM. Next: " +
            "vidcrawl#v1/scrape or vidcrawl#v1/agent on selected URLs.",
        docsUrl: "https://vidcrawl.com/api-reference",
        categories: ["youtube", "video-search"],
        notes: [
            "Base live search is 1 credit ($0.009 at Starter rate); `scrape: true` adds $0.009 per scraped result (reconciled via vendor `metrics.credits_used`). Cached `source: 'index'` search consumes 0 VidCrawl credits.",
        ],
    },
    request: { method: "POST", path: "/v1/search" },
    input: { schema: { body: zVidCrawlSearchBody } },
});
