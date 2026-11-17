import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppStoreKeywordRankingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `app-store/keyword-rankings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "App Store Keyword Rankings",
        summary: "Search the App Store for any keyword and get the apps that " +
            "rank for it, in order: rank, app, developer, rating, reviews " +
            "and price. Use it to track where you...",
        description:
            "Search the App Store for any keyword and get the apps that " +
            "rank for it, in order: rank, app, developer, rating, reviews " +
            "and price. Use it to track where you and your competitors " +
            "rank for the searches that matter. Returns one row per " +
            "ranked app with keyword, country, rank, appId, title, " +
            "appUrl, rating, ratingsCount, free, price, currency, icon. " +
            "To start from an app instead of a keyword use " +
            "mindcase#app-store/app-keywords; for Google Play use " +
            "mindcase#google-play/keyword-rankings. $0.001 per ranked " +
            "app; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/app-store/keyword-rankings",
        categories: ["app-stores"],
        notes: [
            "`maxResults` caps rows per input, so a run can return up to " +
            "that many rows for each `keywords` entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/app-store/keyword-rankings",
    request: {
        method: "POST",
        path: "/v1/data/app-store/keyword-rankings/run",
    },
    input: {
        schema: {
            body: zAppStoreKeywordRankingsBody.extend({
                maxResults: zAppStoreKeywordRankingsBody.shape.maxResults
                    .unwrap().min(1).default(10).describe(
                        "How many ranked apps to return per keyword, from rank 1 down.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.keywords.length;
            const rows = body.maxResults * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
