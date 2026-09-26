import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Get Insurance Request Status",
        summary:
            "Read the public status of one request owned by this application.",
        description:
            "Fetch the public status for a UUID request belonging to the " +
            "credential's approved application. Insuron enforces application " +
            "ownership and returns 404 for an unknown or non-owned request. " +
            "The response is restricted to public status fields; it is not a " +
            "general request, contact, agent, quote, or policy lookup.",
        docsUrl: "https://insuron.io",
        categories: ["insurance-matching"],
    },
    request: { method: "GET", path: "/client/requests/{id}" },
    input: {
        schema: {
            pathParams: z.strictObject({ id: z.string().uuid() }),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        // Keep the connector's output aligned with Insuron's public status
        // projection even if an upstream response ever grows new fields.
        fromResponse: ({ data, utils }) => {
            const output = data.output;
            const id = utils.json.optionalGet(output, "$.id");
            const status = utils.json.optionalGet(output, "$.status");
            const product = utils.json.optionalGet(output, "$.product");
            const state = utils.json.optionalGet(output, "$.state");
            const mode = utils.json.optionalGet(output, "$.mode");
            const createdAt = utils.json.optionalGet(output, "$.createdAt");
            return {
                ...(typeof id === "string" ? { id } : {}),
                ...(typeof status === "string" ? { status } : {}),
                ...(typeof product === "string" ? { product } : {}),
                ...(typeof state === "string" ? { state } : {}),
                ...(typeof mode === "string" ? { mode } : {}),
                ...(typeof createdAt === "string" ? { createdAt } : {}),
            };
        },
    },
});
