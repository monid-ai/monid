import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zProvider } from "../../../schema/common.ts";

export const zQuoteBody = z.object({
    size: z.string().optional().describe(
        "A platform size: small, medium, large or xlarge.",
    ),
    provider: zProvider.optional().describe(
        "One exact provider, e.g. e2b or daytona.",
    ),
    region: z.string().optional().describe("A provider region."),
    timeoutMs: z.number().int().positive().optional().describe(
        "How long the sandbox may live, in ms.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Quote a Sandbox",
        summary:
            "Where a sandbox would be placed now, and its per-second price.",
        description:
            "Price a sandbox before creating it: returns the provider " +
            "and region ComputeSDK would place it on right now and the " +
            "rate it would bill per second, minute and hour. Nothing is " +
            "created and nothing is charged.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/get-quote",
    request: { method: "GET", path: "/api/v1/sandboxes/quote" },
    input: {
        schema: { body: zQuoteBody },
        toRequest: ({ data }) => {
            const b = data.input.body as Record<string, unknown>;
            const q: Record<string, string> = {};
            for (const [k, v] of Object.entries(b)) {
                if (v !== undefined) q[k] = String(v);
            }
            return { queryParams: q };
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) => ({
            quote: {
                ...utils.json.pick(data.output, [
                    "$.quote.ok",
                    "$.quote.reason",
                    "$.quote.providerOrder",
                    "$.quote.rate",
                    "$.quote.rateUsd",
                    "$.quote.estimatedCostUsd",
                    "$.quote.requiredHoldUsd",
                    "$.quote.creditBalanceUsd",
                    "$.quote.topUpPath",
                ]),
                placement: utils.json.pick(data.output, [
                    "$.quote.placement.provider",
                    "$.quote.placement.region",
                    "$.quote.placement.size",
                ]),
            },
        }),
    },
});
