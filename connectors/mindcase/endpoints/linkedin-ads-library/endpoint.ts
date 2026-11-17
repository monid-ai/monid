import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinAdsLibraryBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/ads-library`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Ads",
        summary: "Extract LinkedIn ad details, ad copy, media URL, and " +
            "call-to-action buttons from Ad Library URLs.",
        description: "Extract LinkedIn ad details, ad copy, media URL, and " +
            "call-to-action buttons from Ad Library URLs. Returns one row " +
            "per ad with adUrl, adId, advertiserUrl, paidBy, format, " +
            "headline, body, clickUrl, started, ended, daysActive, " +
            "impressions, impressionsByCountry, targetingLocation, " +
            "mediaUrl, mediaType. For Meta ads use mindcase#facebook/ads; " +
            "for Google ads use mindcase#google-ads/ads. $0.002 per ad; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/ads-library",
        categories: ["linkedin", "ads"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/ads-library",
    request: { method: "POST", path: "/v1/data/linkedin/ads-library/run" },
    input: {
        schema: {
            body: zLinkedinAdsLibraryBody.extend({
                maxResults: zLinkedinAdsLibraryBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Number of ads to return. Required, at least 1.",
                    ),
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
