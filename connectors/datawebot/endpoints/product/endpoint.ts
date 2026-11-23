import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zDatawebotProductBody } from "./schema/inputs.ts";

/**
 * datawebot /product — one product's details, or every seller's offer.
 *
 * Same router and lifecycle as datawebot /search (`POST /v1/requests`,
 * capability `product`; `GET /v1/requests/{id}` finishes a request that
 * answered `working`). The lifecycle source is byte-identical to /search, so
 * the two intern to one fnTable entry.
 */
export default defineEndpoint({
    meta: {
        displayName: "datawebot Product",
        summary:
            "Read one product: details and variants from its page, or every seller's price, shipping and link.",
        description: "Read one ecommerce product. Pass a product page " +
            "`url` on a supported shop to get the shop's own record: " +
            "title, brand, price, original price, availability, images, " +
            "variants with their options, identifiers, category path, " +
            "description, rating and review count. Or pass a `product_id` " +
            'from datawebot Shop Search across shops (`site` "any") to ' +
            "get every seller's offer for that product: shop, price, " +
            "shipping cost, delivered total, stock, delivery note and a " +
            "direct link, with the lowest price as `product.price`. Offers " +
            "from a third-party seller on a marketplace carry " +
            "`marketplace: true`. Each answer carries `meta.as_of`: prices " +
            "are a dated snapshot, not a price history. To find products " +
            "first, use datawebot Shop Search.",
        docsUrl: "https://www.datawebot.com/docs/api/reference",
        categories: ["web-scraping", "amazon", "walmart"],
        notes: [
            "Pass exactly one of `url` or `product_id`.",
            "A product read costs 1 credit by default; some shops price " +
            "differently, and datawebot Sites gives the exact price.",
            "Products with more than 100 variants return the first 100 " +
            "and a `next_cursor`.",
        ],
    },
    endpoint: "/product",
    request: { method: "POST", path: "/v1/requests" },
    input: {
        schema: { body: zDatawebotProductBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: Object.assign({}, data.input.body, { capability: "product" }),
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
            label: "product read",
            description: "datawebot credits, as the answer's own " +
                "`meta.credits_used` reports them",
        },
        /** The published default: 1 credit for one product page. */
        estimate: ({ data }) => {
            const cap = data.input.body.max_credits;
            return {
                counts: {
                    CREDIT: typeof cap === "number" ? Math.min(1, cap) : 1,
                },
            };
        },
    },
});
