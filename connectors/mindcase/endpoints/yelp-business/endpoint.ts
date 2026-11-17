import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYelpBusinessBody } from "./schema/inputs.ts";

/**
 * Mindcase `yelp/business`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Yelp Business",
        summary:
            "Yelp business profiles: address, phone, ratings, attributes, " +
            "photos, review insights, popular dishes and health " +
            "inspections. By URL or location search.",
        description:
            "Yelp business profiles: address, phone, ratings, attributes, " +
            "photos, review insights, popular dishes and health " +
            "inspections. By URL or location search. Returns one row per " +
            "businesse with businessName, businessUrl, address, " +
            "neighborhoods, latitude, longitude, phone, website, menuUrl, " +
            "rating, totalReviews, starBreakdown, reviewInsights, " +
            "reviewHighlights, popularDishes, attributes, specialties, " +
            "summary, yearEstablished, history, photos, " +
            "healthInspections, hoursToday, qACount, qAContent. Paste " +
            "Yelp business page URLs, or search a location by keyword " +
            '(e.g. "coffee" in "San Francisco, CA") with optional sort, ' +
            "price, and feature filters. For individual review text use " +
            "mindcase#yelp/reviews. $0.002 per businesse; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/yelp/business",
        categories: ["local-business"],
        notes: [
            "`limit` does not apply to `urls`: those return one row per " +
            "entry.",
            "`location` must be sent together with `keyword`.",
            "`keyword` must be sent together with `location`.",
        ],
    },
    endpoint: "/yelp/business",
    request: { method: "POST", path: "/v1/data/yelp/business/run" },
    input: {
        schema: {
            body: zYelpBusinessBody.extend({
                limit: zYelpBusinessBody.shape.limit.unwrap().min(1).describe(
                    "How many businesses to return, up to 1000. Each one costs a row, so this caps the bill as well as the output. Required, at least 1.",
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
            const capped =
                (body.location ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.keyword ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.limit : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
