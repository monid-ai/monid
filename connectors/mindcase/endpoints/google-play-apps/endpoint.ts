import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGooglePlayAppsBody } from "./schema/inputs.ts";

/**
 * Mindcase `google-play/apps`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Play Apps",
        summary: "Get Google Play apps with title, app url, developer, " +
            "developer id, rating, ratings count, by inputs or search " +
            "query.",
        description: "Get Google Play apps with title, app url, developer, " +
            "developer id, rating, ratings count, by inputs or search " +
            "query. Returns one row per app with appId, title, appUrl, " +
            "developer, developerId, rating, ratingsCount, reviewsCount, " +
            "ratingHistogram, installs, minInstalls, maxInstalls, price, " +
            "currency, free, offersIAP, iapRange, adSupported, category, " +
            "categoryId, categories, contentRating, summary, description, " +
            "recentChanges, version, androidVersionText, released, " +
            "lastUpdated, available and 13 more fields. Call it by inputs " +
            "(inputs) or search query (query). For reviews use " +
            "mindcase#google/play/reviews; for the searches an app ranks " +
            "for use mindcase#google-play/app-keywords; for iOS apps use " +
            "mindcase#app-store/apps. $0.0025 per app; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google-play/apps",
        categories: ["app-stores"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google-play/apps",
    request: { method: "POST", path: "/v1/data/google-play/apps/run" },
    input: {
        schema: {
            body: zGooglePlayAppsBody.extend({
                maxResults: zGooglePlayAppsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe("How many apps to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
