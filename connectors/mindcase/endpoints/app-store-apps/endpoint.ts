import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppStoreAppsBody } from "./schema/inputs.ts";

/**
 * Mindcase `app-store/apps`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "App Store Apps",
        summary:
            "Get App Store apps with title, subtitle, app url, bundle id, " +
            "developer, developer id, by app ids, search query or " +
            "country.",
        description:
            "Get App Store apps with title, subtitle, app url, bundle id, " +
            "developer, developer id, by app ids, search query or " +
            "country. Returns one row per app with appId, title, " +
            "subtitle, appUrl, bundleId, developer, developerId, " +
            "developerUrl, seller, developerWebsite, supportUrl, " +
            "privacyPolicy, rating, ratingsCount, ratingHistogram, price, " +
            "currency, free, inAppPurchases, category, categoryId, " +
            "categories, contentRating, contentAdvisories, description, " +
            "promotionalText, releaseNotes, version, released, " +
            "lastUpdated and 13 more fields. Call it by app ids (appIds) " +
            "or search query (query). For reviews use " +
            "mindcase#app-store/reviews; for the searches an app ranks " +
            "for use mindcase#app-store/app-keywords; for Android apps " +
            "use mindcase#google-play/apps. $0.0025 per app; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/app-store/apps",
        categories: ["app-stores"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/app-store/apps",
    request: { method: "POST", path: "/v1/data/app-store/apps/run" },
    input: {
        schema: {
            body: zAppStoreAppsBody.extend({
                maxResults: zAppStoreAppsBody.shape.maxResults.unwrap().min(1)
                    .default(10).describe("How many apps to return in total."),
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
