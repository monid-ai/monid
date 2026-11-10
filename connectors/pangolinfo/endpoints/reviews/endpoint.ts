import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBody, zReviewContext } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/amazon/reviews",
    meta: {
        displayName: "Amazon Buyer Reviews",
        summary: "Retrieve Amazon buyer reviews with star and media filters.",
        description:
            "Fetch buyer review text, rating, date, review ID, verified purchase, helpful votes and media. Supply a marketplace origin URL and bizContext.asin; bizContext.pageCount (1-10) is a required spend cap. Costs 5 points per billed page (up to 10 reviews); partial delivery settles using pointCost. Filter by positive/critical or individual stars and sort by recent/helpful. Unknown callback or crawl fields are rejected. Review availability depends on the marketplace and provider maintenance.",
        docsUrl:
            "https://docs.pangolinfo.com/en-api-reference/amazonReviewAPI/amazonReviewAPI",
        categories: ["amazon"],
    },
    request: { method: "POST", path: "/api/v1/scrape" },
    input: {
        schema: {
            body: zBody.extend({
                bizContext: zReviewContext.required({ pageCount: true }).extend(
                    {
                        bizKey: zReviewContext.shape.bizKey.unwrap().default(
                            "review",
                        ),
                        filterByStar: zReviewContext.shape.filterByStar.unwrap()
                            .default("all_stars"),
                        sortBy: zReviewContext.shape.sortBy.unwrap().default(
                            "recent",
                        ),
                    },
                ),
                format: zBody.shape.format.unwrap().default("json"),
                formatType: zBody.shape.formatType.unwrap().default(
                    "all_formats",
                ),
                parserName: zBody.shape.parserName.unwrap().default(
                    "amzReviewV2",
                ),
                mediaType: zBody.shape.mediaType.unwrap().default(
                    "all_contents",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            consumes: { credit: "default", amount: 5 },
            label: "review page",
        },
        estimate: ({ data }) => ({
            counts: { PAGE: data.input.body.bizContext.pageCount },
        }),
        evidence: ({ data, utils }) => {
            const cost = utils.json.optionalNum(data.output, "$.pointCost");
            if (cost === 0) return { counts: { PAGE: 0 } };
            const tasks = utils.json.optionalGet(data.output, "$.data.json");
            let count = 0;
            if (Array.isArray(tasks)) {
                for (const task of tasks) {
                    if (utils.json.optionalNum(task, "$.code") !== 0) continue;
                    if (
                        Array.isArray(
                            utils.json.optionalGet(task, "$.data.results"),
                        )
                    ) count++;
                }
            }
            return {
                counts: {
                    PAGE: Math.min(
                        data.input.body.bizContext.pageCount,
                        count,
                    ),
                },
            };
        },
    },
});
