import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zDatawebotSearchBody } from "./schema/inputs.ts";

/**
 * datawebot /search — a keyword search on one online shop.
 *
 * `POST /v1/requests` (capability `search`) answers inside about 15 s, or
 * with `status: "working"` and a `request_id`; `GET /v1/requests/{id}` is
 * free and finishes it. The lifecycle owns both.
 *
 * A `status: "failed"` answer arrives as HTTP 200. When it used no credits
 * (nothing loaded) it settles as a 502 provider error, zero-billed. When the
 * page loaded and held nothing, datawebot charges the page, so the answer
 * settles as success and the meter bills it — the bill matches the vendor's.
 */
export default defineEndpoint({
    meta: {
        displayName: "datawebot Shop Search",
        summary:
            "Search one online shop by keyword: products with price, rating, reviews, image and link.",
        description: "Search one online shop by keyword and get its " +
            "products as structured records: title, price with currency, " +
            "original price before a discount, rating, review count, " +
            "image, availability and the product link, plus a " +
            "`product_id` to pass to datawebot Product. Name the shop by " +
            "domain (amazon.com, walmart.com, allbirds.com) or by name, " +
            'and pick the market with `country`. Set `site` to "any" to ' +
            "search across shops for one product type. Ads are returned " +
            "apart from organic results, in `sponsored`. Returns up to 20 " +
            "products from one results page. For one product's full " +
            "details or every seller's price, use datawebot Product " +
            "instead; to check whether a shop is supported and what it " +
            "costs before searching, use datawebot Sites.",
        docsUrl: "https://www.datawebot.com/docs/api/reference",
        categories: ["web-scraping", "amazon", "walmart"],
        notes: [
            'A search on one named shop costs 5 credits; `site` "any" ' +
            "(across shops) costs 25. Some shops price differently: " +
            "datawebot Sites gives the exact price.",
            "A search on a named shop that finds nothing is free.",
            "`warnings` lists `field_empty:<field>` when 5 or more results " +
            "came back and none had that field: read it as unknown, not " +
            "zero.",
        ],
    },
    endpoint: "/search",
    request: { method: "POST", path: "/v1/requests" },
    input: {
        schema: {
            body: zDatawebotSearchBody.required({ query: true, site: true }),
        },
        toRequest: ({ data }) => ({
            ...data.input,
            body: Object.assign({}, data.input.body, { capability: "search" }),
        }),
    },
    lifecycle: {
        state: z.strictObject({}),
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            const id = utils.json.optionalGet(res.body, "$.request_id");
            if (status === "working") {
                if (typeof id !== "string" || id === "") {
                    throw new Error(
                        "datawebot answered working without a request_id",
                    );
                }
                const after = utils.json.optionalGet(
                    res.body,
                    "$.check_after_seconds",
                );
                return {
                    kind: "RUNNING",
                    state: { externalRunId: id },
                    ...(typeof after === "number" && after > 0
                        ? { pollAfterMs: Math.min(after * 1000, 30_000) }
                        : {}),
                };
            }
            const used = utils.json.optionalGet(
                res.body,
                "$.meta.credits_used",
            );
            if (
                status === "failed" && !(typeof used === "number" && used > 0)
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
        poll: async ({ data, utils }) => {
            const id = data.lifecycle.state.externalRunId;
            if (id === undefined) {
                throw Object.assign(
                    new Error("datawebot poll without a request_id"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/v1/requests/" + encodeURIComponent(id),
            });
            if (res.status === 429 || res.status >= 500) {
                return { kind: "RUNNING", pollAfterMs: 10_000 };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "working") {
                const after = utils.json.optionalGet(
                    res.body,
                    "$.check_after_seconds",
                );
                return typeof after === "number" && after > 0
                    ? {
                        kind: "RUNNING",
                        pollAfterMs: Math.min(after * 1000, 30_000),
                    }
                    : { kind: "RUNNING" };
            }
            const used = utils.json.optionalGet(
                res.body,
                "$.meta.credits_used",
            );
            if (
                status === "failed" && !(typeof used === "number" && used > 0)
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "shop search",
            description: "datawebot credits, as the answer's own " +
                "`meta.credits_used` reports them",
        },
        /** The published default: 5 credits for one results page on a
         *  named shop, 25 across shops. A caller's `max_credits` caps it. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const price = body.site.toLowerCase() === "any" ? 25 : 5;
            const cap = body.max_credits;
            return {
                counts: {
                    CREDIT: typeof cap === "number"
                        ? Math.min(price, cap)
                        : price,
                },
            };
        },
    },
});
