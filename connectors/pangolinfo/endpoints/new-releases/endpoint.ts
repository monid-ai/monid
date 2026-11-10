import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/amazon/new-releases",
    meta: {
        displayName: "Amazon New Releases",
        summary: "Read the bestselling new releases in an Amazon category.",
        description:
            "Find recently launched products that rank in an Amazon category. Pass a category slug such as electronics as content and a marketplace as site. Returns the native ranking payload; recsList may be a JSON-encoded string. Costs 1 point per page.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/amazonApi/submit",
        categories: ["amazon"],
    },
    request: { method: "POST", path: "/api/v1/scrape" },
    input: {
        schema: {
            body: zBody.extend({
                parserName: z.literal("amzNewReleases").default(
                    "amzNewReleases",
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
