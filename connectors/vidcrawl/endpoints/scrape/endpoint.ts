import { defineEndpoint } from "@shared/core";
import { zVidCrawlScrapeBody } from "./schema/inputs.ts";

/**
 * `POST /v1/scrape` — Layer 1 deterministic video context extraction.
 */
export default defineEndpoint({
    meta: {
        displayName: "VidCrawl Video Scrape",
        summary: "Extract video metadata, chapters, timestamped transcript, " +
            "and 3x3 visual storyboard grids as Markdown and JSON.",
        description: "Deterministic Layer 1 extraction for YouTube, TikTok, " +
            "Instagram Reels, and X/Twitter videos with zero LLM tokens. " +
            "Returns cleaned metadata (title, author, duration, views, " +
            "likes, chapters, unwrapped description links), deduplicated " +
            "timestamped transcripts (native captions with Whisper ASR " +
            "fallback when absent on supported platforms), LLM-ready " +
            "Markdown, and lightweight 3x3 visual storyboard JPEG sheets. " +
            "Costs 1 credit ($0.009 at the Starter rate); repeated scrapes " +
            "within the cache window can return cached results. Next: " +
            "vidcrawl#v1/frames to inspect dense code, slides, or UI at " +
            "specific timestamps, or vidcrawl#v1/agent for autonomous Q&A.",
        docsUrl: "https://vidcrawl.com/api-reference",
        categories: ["youtube", "tiktok", "instagram", "twitter"],
        notes: [
            "1 credit ($0.009 at Starter rate, $0.00725 on Growth). Upstream failures auto-refund and charge 0.",
        ],
    },
    request: { method: "POST", path: "/v1/scrape" },
    input: { schema: { body: zVidCrawlScrapeBody } },
});
