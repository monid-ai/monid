import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zVidCrawlAgentBody } from "./schema/inputs.ts";

/**
 * `POST /v1/agent` — Layer 3 autonomous multimodal video Q&A & extraction.
 */
export default defineEndpoint({
    meta: {
        displayName: "VidCrawl Video Agent",
        summary: "Run a bounded video agent across 1-10 URLs for cited " +
            "Q&A, OCR, scene breakdowns, and structured JSON extraction.",
        description: "Layer 3 autonomous video intelligence. Give a " +
            "`prompt`, 1 to 10 video `urls`, and an optional JSON `schema`. " +
            "The agent executes progressive disclosure internally: scrapes " +
            "transcripts and 3x3 storyboard sheets, selects key timestamps " +
            "to inspect sharp frames when visual context (UI, code, slides, " +
            "charts, text overlays) matters, and synthesizes `summary`, " +
            "`visual_hook`, `on_screen_ocr`, `scenes`, structured `data`, " +
            "and verified `[MM:SS]` `citations`. Effort controls cost: " +
            "`low` (default) = 3 credits ($0.027), `medium` = 5 credits " +
            "($0.045), `high` = 10 credits ($0.090).",
        docsUrl: "https://vidcrawl.com/api-reference",
        categories: [
            "youtube",
            "tiktok",
            "instagram",
            "twitter",
            "agents",
        ],
        notes: [
            "$0.027 for effort 'low' (default, 3 credits at Starter rate); 'medium' costs $0.045 (5 credits) and 'high' costs $0.090 (10 credits), reconciled from `usage.credits_used`.",
        ],
    },
    request: { method: "POST", path: "/v1/agent" },
    input: { schema: { body: zVidCrawlAgentBody } },
    timeouts: { requestMs: 180_000, runMs: 180_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.027 },
        },
    },
});
