import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleAdsAdsBody } from "./schema/inputs.ts";

/**
 * Mindcase `google-ads/ads`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Ads Library",
        summary:
            "Extract ads from the Google Ads Transparency Center for any " +
            "advertiser or website: format, first and last shown dates, " +
            "countries with impression ranges per...",
        description:
            "Extract ads from the Google Ads Transparency Center for any " +
            "advertiser or website: format, first and last shown dates, " +
            "countries with impression ranges per country and per Google " +
            "surface, and ad text, link and image. Returns one row per ad " +
            "with adUrl, adId, advertiserId, advertiserName, format, " +
            "headline, body, clickUrl, mediaUrl, startDate, endDate, " +
            "daysActive, regions, impressionsByCountry, variations, " +
            "targeting. Call it by website (domains) or advertiser " +
            "(advertisers). For Meta ads use mindcase#facebook/ads; for " +
            "TikTok ads use mindcase#tiktok/ads. $0.002 per ad; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google-ads/ads",
        categories: ["ads"],
        notes: [
            "Requires an advertiser website domain, or an advertiser name " +
            "or Google advertiser ID.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google-ads/ads",
    request: { method: "POST", path: "/v1/data/google-ads/ads/run" },
    input: {
        schema: {
            body: zGoogleAdsAdsBody.extend({
                maxResults: zGoogleAdsAdsBody.shape.maxResults.unwrap().min(1)
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
