import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/amazon/bestsellers",
    meta: {
        displayName: "Amazon Bestsellers",
        summary: "Read the bestselling products in an Amazon category.",
        description:
            "Read the Amazon bestseller ranking for a category slug such as electronics or electronics/172282. Pass the slug as content and a marketplace as site. Returns the native ranking payload, including recsList when present (a JSON-encoded string). Costs 1 point per page.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/amazonApi/submit",
        categories: ["amazon"],
    },
    request: { method: "POST", path: "/api/v1/scrape" },
    input: {
        schema: {
            body: zBody.extend({
                parserName: z.literal("amzBestSellers").default(
                    "amzBestSellers",
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
