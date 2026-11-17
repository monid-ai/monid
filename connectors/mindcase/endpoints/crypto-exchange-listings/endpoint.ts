import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCryptoExchangeListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `crypto/exchange-listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Crypto Exchange Listings",
        summary:
            "Tracks when trading pairs are listed, delisted, or otherwise " +
            "changed on crypto exchanges.",
        description:
            "Tracks when trading pairs are listed, delisted, or otherwise " +
            "changed on crypto exchanges. Returns one row per exchange " +
            "listing event with listingId, exchange, product, pair, base, " +
            "quote, eventType, effectiveAt, publishedAt. For the project " +
            "behind a pair use mindcase#crypto/projects. $0.001 per " +
            "exchange listing event; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/crypto/exchange-listings",
        categories: ["token-prices"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/crypto/exchange-listings",
    request: { method: "POST", path: "/v1/data/crypto/exchange-listings/run" },
    input: {
        schema: {
            body: zCryptoExchangeListingsBody.extend({
                maxResults: zCryptoExchangeListingsBody.shape.maxResults
                    .unwrap().min(1).default(100).describe(
                        "How many exchange listing events to return in total.",
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
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
