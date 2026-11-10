import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/maps/local",
    meta: {
        displayName: "Google Maps Local Businesses",
        summary: "Search local businesses by query and map center.",
        description:
            "Search Google Maps for local businesses near a latitude/longitude and zoom. Pass q, ll (for example 37.7822,-122.4642,13z), and an explicit num result cap (1-100). Returns native business data such as name, address, rating and review count. start selects an offset and hl a language. One request costs 1.5 points regardless of result count. No automatic pagination or background callback is started.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/mapDataApi/mapDataAPI",
        categories: ["maps"],
    },
    request: { method: "POST", path: "/api/v3/extract/search/maps/local" },
    input: {
        schema: {
            body: zBody.required({ num: true }).extend({
                hl: zBody.shape.hl.unwrap().default("en"),
                start: zBody.shape.start.unwrap().default(0),
                timeout: zBody.shape.timeout.unwrap().default(25000),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            consumes: { credit: "default", amount: 1.5 },
            label: "local search",
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
    },
});
