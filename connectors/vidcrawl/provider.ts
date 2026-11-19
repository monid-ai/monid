import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * VidCrawl (vidcrawl.com) — deterministic video transcripts, visual storyboard
 * contact sheets, targeted frame extraction, video search, and bounded
 * multimodal video Q&A for AI agents.
 *
 * Authentication: `x-api-key: <key>` (or `Authorization: Bearer <key>`).
 * Base URL: `https://vidcrawl.com`.
 *
 * Billing: priced in US dollars at the published Starter pack rate ($9 for
 * 1,000 non-expiring credits = $0.009/credit; Growth is $29 for 4,000 =
 * $0.00725/credit; 100 free credits on signup). Every 2xx payload carries
 * VidCrawl's credit receipt (`metrics.credits_used` on `/v1/scrape`,
 * `/v1/frames`, `/v1/search`; `usage.credits_used` on `/v1/agent`), which
 * `usage.consolidate` converts to USD when non-zero while leaving the full
 * metrics/usage payload intact for callers. Failed upstream calls (4xx/5xx)
 * automatically refund credits and bill 0 in the engine.
 */
export default defineProvider({
    name: "vidcrawl",
    meta: {
        displayName: "VidCrawl",
        summary: "Deterministic video transcripts, visual storyboards, " +
            "timestamped frames, and video Q&A for AI agents.",
        description: "Video context and inspection API built on progressive " +
            "disclosure instead of raw MP4 ingestion. Scrape any YouTube, " +
            "TikTok, Instagram Reels, or X/Twitter video into LLM-ready " +
            "Markdown, chapters, unwrapped description links, deduplicated " +
            "timestamped transcripts, and 3x3 visual storyboard grids " +
            "($0.009 Starter rate). Extract high-res JPEG frames at exact " +
            "timestamps ($0.009), search videos ($0.009 live; $0 cached " +
            "index), or run a bounded video agent that cites `[MM:SS]` " +
            "timestamps and optionally populates a JSON Schema ($0.027 low, " +
            "$0.045 medium, $0.090 high). Failed upstream calls charge 0 " +
            "credits.",
        homepageUrl: "https://vidcrawl.com",
        docsUrl: "https://vidcrawl.com/api-reference",
        categories: [
            "youtube",
            "tiktok",
            "instagram",
            "twitter",
            "video-search",
        ],
        notes: [
            "Starter pack rate is $0.009/credit ($9 for 1,000 non-expiring " +
            "credits; Growth is $29 for 4,000 = $0.00725/credit). New " +
            "accounts include 100 free credits; upstream errors charge 0.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://vidcrawl.com" },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.009 },
        },
        consolidate: ({ data, utils }) => {
            const metricsCredits = utils.json.optionalNum(
                data.output,
                "$.metrics.credits_used",
            );
            const agentCredits = utils.json.optionalNum(
                data.output,
                "$.usage.credits_used",
            );
            const rawCredits = metricsCredits !== undefined
                ? metricsCredits
                : agentCredits;
            const usd = rawCredits !== undefined && rawCredits > 0
                ? Math.round(rawCredits * 9) / 1000
                : undefined;
            return {
                credits: {
                    ...(usd !== undefined ? { default: usd } : {}),
                },
            };
        },
    },
    output: {
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "VidCrawl API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
