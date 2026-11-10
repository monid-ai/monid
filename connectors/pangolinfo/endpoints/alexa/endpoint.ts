import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/amazon/rufus",
    meta: {
        displayName: "Amazon Rufus Shopping Answers",
        summary: "Ask Amazon Rufus shopping questions in the US or Japan.",
        description:
            "Ask 1-5 shopping questions in param and receive answers, grouped product recommendations and follow-up suggestions. Turns within one call share context. US requests can bind a product with asin or url; if both are supplied they must match. Product context is US-only; use site=jp for general Japanese questions. Each answered turn costs 6 points; refused and failed turns are free. Code 9207 means every question was refused: rephrase rather than retrying. This is a synchronous API; allow up to 270 seconds and do not launch concurrent duplicates while waiting.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/amazonAlexaAPI/amazonAlexaAPI",
        categories: ["amazon"],
    },
    request: { method: "POST", path: "/api/v2/scrape" },
    input: {
        schema: {
            body: zBody.extend({
                parserName: zBody.shape.parserName.unwrap().default(
                    "amazonAlexa",
                ),
                site: zBody.shape.site.unwrap().default("us"),
                screenshot: zBody.shape.screenshot.unwrap().default(false),
                timeout: zBody.shape.timeout.unwrap().default(240000),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 6 },
            label: "answered turn",
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.param.length },
        }),
        evidence: ({ data, utils }) => {
            const cost = utils.json.optionalNum(data.output, "$.pointCost");
            if (cost === 0) return { counts: { RESULT: 0 } };
            const turns = utils.json.optionalGet(data.output, "$.data.json");
            let count = 0;
            if (Array.isArray(turns)) {
                for (const turn of turns) {
                    const status = utils.json.optionalGet(turn, "$.status");
                    if (typeof status === "string") {
                        if (status === "answered") count++;
                        continue;
                    }
                    const content = utils.json.optionalGet(turn, "$.content");
                    const products = utils.json.optionalGet(turn, "$.products");
                    const followUps = utils.json.optionalGet(
                        turn,
                        "$.follow_up_questions",
                    );
                    if (
                        (typeof content === "string" &&
                            content.trim() !== "") ||
                        (Array.isArray(products) && products.length > 0) ||
                        (Array.isArray(followUps) && followUps.length > 0)
                    ) count++;
                }
            }
            return { counts: { RESULT: count } };
        },
    },
});
