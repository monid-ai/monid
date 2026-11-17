import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookAdsBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/ads`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Meta Ads Library",
        summary: "Every ad a brand runs in Meta's Ad Library: creative, " +
            "headline, CTA, link, dates, format, platforms, advertiser, " +
            "and EU reach where disclosed.",
        description: "Every ad a brand runs in Meta's Ad Library: creative, " +
            "headline, CTA, link, dates, format, platforms, advertiser, " +
            "and EU reach where disclosed. Returns one row per ad with " +
            "adUrl, libraryId, pageUrl, headline, bodyText, " +
            "linkDescription, ctaText, destinationUrl, format, startDate, " +
            "endDate, daysActive, isActive, mediaUrl, mediaType, " +
            "platforms, advertiser, cards, euReach, reachBreakdown, " +
            "variantCount. Give a Facebook page URL or handle; set how " +
            "many ads to return and whether to include inactive ads. For " +
            "TikTok ads use mindcase#tiktok/ads; for Google ads use " +
            "mindcase#google-ads/ads; for LinkedIn ads use " +
            "mindcase#linkedin/ads-library. $0.005 per ad; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/ads",
        categories: ["facebook", "ads"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/ads",
    request: { method: "POST", path: "/v1/data/facebook/ads/run" },
    input: {
        schema: {
            body: zFacebookAdsBody.extend({
                maxResults: zFacebookAdsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of ads to return in total. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
