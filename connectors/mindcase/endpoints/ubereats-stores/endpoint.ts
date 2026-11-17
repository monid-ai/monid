import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zUbereatsStoresBody } from "./schema/inputs.ts";

/**
 * Mindcase `ubereats/stores`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Uber Eats Stores",
        summary: "Uber Eats stores with business name, cuisines, store type, " +
            "rating and review count. Search by location.",
        description:
            "Uber Eats stores with business name, cuisines, store type, " +
            "rating and review count. Search by location. Returns one row " +
            "per store with storeId, storeUrl, businessName, cuisines, " +
            "storeType, rating, reviewsApprox, priceRange, etaMinutes, " +
            "etaText, distance, address, latitude, longitude, location, " +
            "phone, isChain, chain, isOpen, isOrderable, storeStatus, " +
            "closedMessage, openingHours, diningModes, currency, " +
            "coverPhoto, logo. For menu items and prices use " +
            "mindcase#ubereats/products. $0.01 per store; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ubereats/stores",
        categories: ["local-business"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ubereats/stores",
    request: { method: "POST", path: "/v1/data/ubereats/stores/run" },
    input: {
        schema: {
            body: zUbereatsStoresBody.extend({
                maxResults: zUbereatsStoresBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many stores to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
