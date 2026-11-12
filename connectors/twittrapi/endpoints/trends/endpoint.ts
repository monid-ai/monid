import { defineEndpoint } from "@shared/core";
import { zNoQueryParams } from "../../schema/common.ts";
import { zTrendsPathParams } from "./schema/inputs.ts";

/**
 * `GET /trends/{locationId}` — current trending topics on X for a place, by WOEID.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Trends",
        summary: "Current trending topics on X for a place, by WOEID.",
        description:
            "Get the current trending topics on X (Twitter) for a place, by Yahoo " +
            "WOEID: each trend's name, search query and, where X reports it, tweet " +
            "volume and context. 1 is worldwide, 23424977 the United States, 23424975 " +
            "the United Kingdom. To dig into a trend, pass its query to " +
            "twittrapi#search.",
        docsUrl: "https://www.twittrapi.com/docs/reference/trends-locationid",
        categories: ["twitter"],
        notes: [
            "Not paginated: one call returns the whole trend list.",
        ],
    },
    request: { method: "GET", path: "/trends/{locationId}" },
    input: {
        schema: {
            pathParams: zTrendsPathParams,
            queryParams: zNoQueryParams,
        },
    },
});
