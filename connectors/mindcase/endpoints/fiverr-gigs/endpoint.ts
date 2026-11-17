import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFiverrGigsBody } from "./schema/inputs.ts";

/**
 * Mindcase `fiverr/gigs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Fiverr Gigs",
        summary: "Fiverr gigs with title, URL and seller details. Search by " +
            "keyword or pass a Fiverr URL.",
        description:
            "Fiverr gigs with title, URL and seller details. Search by " +
            "keyword or pass a Fiverr URL. Returns one row per gig with " +
            "gigId, gigTitle, gigUrl, sellerUsername, sellerName, " +
            "sellerId, sellerUrl, sellerLevel, sellerCountry, " +
            "sellerLanguages, sellerOnline, proSeller, rating, reviews, " +
            "sellerRating, sellerReviews, startingPrice, currency, " +
            "deliveryDays, packages, extraFastDelivery, fiverrChoice, " +
            "badges, offersConsultation, offersSubscription, categoryId, " +
            "subcategoryId, gigAttributes, hasVideo, mainImage and 4 more " +
            "fields. Call it by search query (query) or fiverr url " +
            "(fiverrURL). $0.0035 per gig; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/fiverr/gigs",
        categories: ["jobs"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/fiverr/gigs",
    request: { method: "POST", path: "/v1/data/fiverr/gigs/run" },
    input: {
        schema: {
            body: zFiverrGigsBody.extend({
                maxResults: zFiverrGigsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe("How many gigs to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0035 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
