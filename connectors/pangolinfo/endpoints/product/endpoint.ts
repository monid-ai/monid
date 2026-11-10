import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/amazon/product",
    meta: {
        displayName: "Amazon Product Detail",
        summary: "Fetch a full Amazon product detail page.",
        description:
            "Read title, price, rating, seller, images, delivery, variations and embedded review summaries for one ASIN. Pass the ASIN as content and a marketplace as site. JSON output costs 1 point. Codes 9204 and 9206 can be billed semantic outcomes; inspect the envelope and do not retry automatically.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/amazonApi/submit",
        categories: ["amazon"],
    },
    request: { method: "POST", path: "/api/v1/scrape" },
    input: {
        schema: {
            body: zBody.extend({
                parserName: z.literal("amzProductDetail").default(
                    "amzProductDetail",
                ),
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
