import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV3EventsPredictionMarketsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Prediction Markets for Events",
        summary:
            "Open Polymarket and Kalshi markets that given events, storylines or arcs bear on.",
        description:
            "Returns the open Polymarket and Kalshi markets that events, " +
            "storylines or arcs bear on, grouped under each id in " +
            "`related`. Each market carries its title, link, close time, " +
            "the event ids it relates to and, when measured, the odds of " +
            "one outcome an hour before and after a linked event's first " +
            "post, and whether that move was unusual. `ids` takes any mix of the three kinds. About one " +
            "event in eight has a market.",
        docsUrl:
            "https://docs.elfa.ai/api/v3/endpoints/list-prediction-markets",
        categories: ["prediction-markets", "crypto-signals"],
        notes: [
            "Free for now.",
            "Get ids from elfa#v3/events, elfa#v3/events/storylines or " +
            "elfa#v3/events/arcs.",
        ],
    },
    request: { method: "GET", path: "/v3/events/prediction-markets" },
    input: {
        schema: {
            queryParams: zV3EventsPredictionMarketsQueryParams.extend({
                limit: zV3EventsPredictionMarketsQueryParams.shape.limit
                    .unwrap().default(10),
            }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data, utils, logger }) => {
            const charged = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.credits",
            );
            if (typeof charged === "number" && charged > 0) {
                logger.warn("elfa charged a free endpoint", { charged });
            }
            return { credits: {}, output: data.output };
        },
    },
});
