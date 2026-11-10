import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/amazon/offers",
    meta: {
        displayName: "Amazon Competing Seller Offers",
        summary: "Retrieve competing offers for an Amazon ASIN.",
        description:
            "Get competing seller offers, prices, delivery, shipsFrom and soldBy for an ASIN. Pass the ASIN as content and the marketplace as site; bizContext.zipcode selects a delivery address. Costs 1 point. No-other-sellers (9201), missing ASIN (9204) and confirmed redirect (9206) can be billed outcomes; inspect code and message and do not retry automatically.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/amazonFollowSellerAPI/submit",
        categories: ["amazon"],
    },
    request: { method: "POST", path: "/api/v1/scrape/follow-seller" },
    input: {
        schema: {
            body: zBody.extend({
                timeout: zBody.shape.timeout.unwrap().default(90000),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            consumes: { credit: "default", amount: 1 },
            label: "offer page",
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
    },
});
