import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3CallsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Trading Calls",
        summary:
            "Posts that open, add to, trim, close or reverse a position, with setup and thesis.",
        description: "Every call: one post that opened, added to, trimmed, " +
            "reaffirmed, reversed, closed or stopped out of a position, " +
            "with its setup and thesis. Telegram calls are returned, but " +
            "only an X handle can be filtered on.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/list-calls",
        categories: ["crypto-signals", "equities"],
        notes: [
            "1 credit, plus 1 per call not already billed to the " +
            "platform's Elfa account in the last 24 hours.",
            "`from` is required unless `callIds` is sent.",
        ],
    },
    request: { method: "GET", path: "/v3/calls" },
    input: {
        schema: {
            queryParams: zV3CallsQueryParams.extend({
                limit: zV3CallsQueryParams.shape.limit.unwrap().default(10),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                request: {
                    kind: UsageModelKind.PER_CALL,
                    label: "request",
                    consumes: { credit: "default", amount: 1 },
                },
                calls: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "calls",
                    description:
                        "calls returned and not already billed to the platform's Elfa account in the last 24 hours",
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
        estimate: ({ data }) => {
            const query = data.input.queryParams;
            const ids = query?.callIds;
            return {
                counts: {
                    calls: ids !== undefined && ids.length > 0
                        ? ids.length
                        : query?.limit ?? 0,
                },
            };
        },
        evidence: ({ data, utils }) => {
            const billed = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.objects",
            );
            const model = data.usage.model;
            const rate = model.kind === "COMPOSITE"
                ? model.components["calls"]?.consumes.amount ?? 0
                : 0;
            const list = utils.json.optionalGet(data.output, "$.calls");
            return {
                counts: {
                    calls: typeof billed === "number" && rate > 0
                        ? billed / rate
                        : Array.isArray(list)
                        ? list.length
                        : 0,
                },
            };
        },
    },
});
