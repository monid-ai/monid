import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokAdsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/ads`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Ads",
        summary: "TikTok ads from the Ad Library with advertiser, paid-by " +
            "entity, ad copy and CTA text. Search by keyword or " +
            "advertiser, or pass ad URLs.",
        description:
            "TikTok ads from the Ad Library with advertiser, paid-by " +
            "entity, ad copy and CTA text. Search by keyword or " +
            "advertiser, or pass ad URLs. Returns one row per ad with " +
            "adId, adUrl, advertiserName, advertiserId, paidBy, body, " +
            "ctaText, clickUrl, objective, startDate, endDate, " +
            "daysActive, reach, reachBreakdown, targeting, advertiser, " +
            "mediaUrl, videos. Call it by search query (query), " +
            "advertiser (advertiser) or urls (urls). For Meta ads use " +
            "mindcase#facebook/ads; for Google ads use " +
            "mindcase#google-ads/ads; for LinkedIn ads use " +
            "mindcase#linkedin/ads-library. $0.002 per ad; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/ads",
        categories: ["tiktok", "ads"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tiktok/ads",
    request: { method: "POST", path: "/v1/data/tiktok/ads/run" },
    input: {
        schema: {
            body: zTiktokAdsBody.extend({
                maxResults: zTiktokAdsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe("How many ads to return in total."),
            }),
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
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
