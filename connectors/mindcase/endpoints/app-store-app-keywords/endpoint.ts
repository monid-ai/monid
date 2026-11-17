import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppStoreAppKeywordsBody } from "./schema/inputs.ts";

/**
 * Mindcase `app-store/app-keywords`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "App Store Keywords for an App",
        summary: "See every App Store search an app ranks for, with its " +
            "position and monthly search volume. Enter a competitor's app " +
            "to find which searches bring them...",
        description: "See every App Store search an app ranks for, with its " +
            "position and monthly search volume. Enter a competitor's app " +
            "to find which searches bring them installs, and which " +
            "keywords to target yourself. Returns one row per keyword " +
            "ranking with keyword, appId, title, appUrl, rank, " +
            "searchVolume, resultsCount, rating, ratingsCount, free, " +
            "updatedAt. To start from a keyword instead of an app use " +
            "mindcase#app-store/keyword-rankings; for Google Play use " +
            "mindcase#google-play/app-keywords. $0.003 per keyword " +
            "ranking; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/app-store/app-keywords",
        categories: ["app-stores"],
        notes: [
            "`maxResults` caps rows per input, so a run can return up to " +
            "that many rows for each `apps` entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/app-store/app-keywords",
    request: { method: "POST", path: "/v1/data/app-store/app-keywords/run" },
    input: {
        schema: {
            body: zAppStoreAppKeywordsBody.extend({
                maxResults: zAppStoreAppKeywordsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many keywords to return per app, highest search volume first.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.apps.length;
            const rows = body.maxResults * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
