import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokVideoAnalyticsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/video-analytics`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Video Analytics",
        summary: "Returns view, like, comment and save totals for a TikTok " +
            "video plus its growth curve for the first 14 days after " +
            "posting.",
        description:
            "Returns view, like, comment and save totals for a TikTok " +
            "video plus its growth curve for the first 14 days after " +
            "posting. Returns one row per video metric report with " +
            "videoId, videoUrl, views, likes, comments, saves, " +
            "trendInterval, viewsTrend, likesTrend, commentsTrend, " +
            "savesTrend. To find videos first use mindcase#tiktok/posts; " +
            "to download the file use mindcase#tiktok/download. $0.002 " +
            "per video metric report; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/video-analytics",
        categories: ["tiktok"],
    },
    endpoint: "/tiktok/video-analytics",
    request: { method: "POST", path: "/v1/data/tiktok/video-analytics/run" },
    input: {
        schema: {
            body: zTiktokVideoAnalyticsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.videoUrls.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
