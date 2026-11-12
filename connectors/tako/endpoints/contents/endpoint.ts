import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zContentsBody } from "../../schema/contents.ts";

export default defineEndpoint({
    meta: {
        displayName: "Tako Contents",
        summary: "Fetch a Tako card's data rows or a web page's text.",
        description: "Fetch the content behind a search result. Pass a " +
            "card's webpage_url from tako#v3/search to get the card's data " +
            "rows as CSV or JSON, or any web page URL to get its extracted " +
            "text. Card exports bill $0.001 plus a per-row rate, and web " +
            "pages bill $0.001 each. Set max_cost_usd to the most you'll " +
            "pay. Over the cap, the call is free and returns the price.",
        docsUrl:
            "https://docs.tako.com/documentation/integrating-tako/contents/overview",
        categories: ["web-scraping", "web-extraction"],
        notes: [
            "max_cost_usd is required. Tako prices the call before it reads " +
            "any data and returns a 422 with error_type COST_CAP_EXCEEDED " +
            "and the price in quoted_cost_usd, unbilled, when the price is " +
            "above the cap.",
            "A card export without max_rows returns the whole card in 'url' " +
            "mode, up to 100,000 rows, and bills every row.",
            "premium is billed per premium record on top of the row rate, " +
            "and max_cost_usd covers it.",
        ],
    },
    request: { method: "POST", path: "/v1/contents" },
    input: {
        schema: {
            body: zContentsBody.omit({ quote_only: true, zdr: true }).extend({
                mode: zContentsBody.shape.mode.unwrap().default("inline")
                    .describe(
                        "Delivery mode. 'inline' returns the content in the " +
                            "response: card data up to 2,000 rows unless " +
                            "max_rows asks for more. 'url' returns a " +
                            "presigned download link. Defaults to 'inline'.",
                    ),
                max_cost_usd: zContentsBody.shape.max_cost_usd.unwrap().min(
                    0.001,
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.001 },
                    label: "base price",
                    description: "one card export or one web page",
                },
                metered: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.CREDIT,
                    consumes: { credit: "default", amount: 0.00001 },
                    label: "usage above base price, $0.00001 units",
                    description: "card rows, premium records, and per-unit " +
                        "data such as website traffic",
                },
            },
        },
        estimate: ({ data }) => {
            const model = data.usage.model;
            if (model.kind !== "COMPOSITE") return { counts: {} };
            const call = model.components.call;
            const metered = model.components.metered;
            if (call?.kind !== "PER_CALL" || metered?.kind !== "PER_UNIT") {
                return { counts: {} };
            }
            const unitsPerUsd = Math.round(1 / metered.consumes.amount);
            const units = Math.max(
                0,
                Math.ceil(data.input.body.max_cost_usd * unitsPerUsd) -
                    Math.round(call.consumes.amount * unitsPerUsd),
            );
            return { counts: units > 0 ? { metered: units } : {} };
        },
    },
});
