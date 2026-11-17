import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/amazon/search",
    meta: {
        displayName: "Amazon Keyword Search",
        summary: "Search Amazon and return structured product listings.",
        description:
            "Read ASINs, titles, prices, ratings, sponsored placements and pagination from one Amazon search page. Supply a full HTTPS Amazon search URL, including keyword, page, sorting and filters, for example https://www.amazon.com/s?k=wireless+earbuds&page=2. One page costs 1 point; the connector never follows nextPage.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/amazonApi/submit",
        categories: ["amazon"],
    },
    request: { method: "POST", path: "/api/v1/scrape" },
    input: {
        schema: {
            body: zBody.extend({
                parserName: z.literal("amzKeyword").default("amzKeyword"),
                format: z.literal("json").default("json"),
                timeout: zBody.shape.timeout.unwrap().default(60000),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            consumes: { credit: "default", amount: 1 },
            label: "page",
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
    },
});
