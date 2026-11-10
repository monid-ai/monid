import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/amazon/seller",
    meta: {
        displayName: "Amazon Seller Products",
        summary: "List products offered by an Amazon seller.",
        description:
            "Read a seller storefront with ASIN, price, rating and display rank. Pass seller ID as content and the marketplace as site. Explicit pageCount (1-3) requests the first N pages and sets the spend cap: 1 point per successful page. categoryId optionally filters the storefront. Results are merged without a delivered-page count, so usage evidence retains the requested cap; the actual pointCost receipt settles partial delivery and account discounts.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/amazonApi/submit",
        categories: ["amazon"],
    },
    request: { method: "POST", path: "/api/v1/scrape" },
    input: {
        schema: {
            body: zBody.required({ pageCount: true }).extend({
                parserName: z.literal("amzProductOfSeller").default(
                    "amzProductOfSeller",
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
            label: "seller page",
        },
        estimate: ({ data }) => ({
            counts: { PAGE: data.input.body.pageCount },
        }),
        evidence: ({ data, utils }) => {
            const cost = utils.json.optionalNum(data.output, "$.pointCost");
            // The merged response has no delivered-page count. A discounted
            // receipt cannot establish pages; retain the request cap as fallback.
            return {
                counts: { PAGE: cost === 0 ? 0 : data.input.body.pageCount },
            };
        },
    },
});
