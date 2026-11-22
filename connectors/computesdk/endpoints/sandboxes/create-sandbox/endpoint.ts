import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zProvider } from "../../../schema/common.ts";

export const zCreateSandboxBody = z.object({
    label: z.string().max(200).optional().describe(
        "A name to find the sandbox by later.",
    ),
    size: z.string().optional().describe(
        "A platform size: small, medium, large or xlarge. Defaults to the smallest.",
    ),
    provider: zProvider.optional().describe(
        "Pin one provider, e.g. e2b or daytona. Omit to let ComputeSDK pick.",
    ),
    region: z.string().optional().describe("A provider region."),
    timeoutMs: z.number().int().positive().optional().describe(
        "Destroy the sandbox automatically after this many ms. Default 30 minutes.",
    ),
    idempotencyKey: z.string().optional().describe(
        "Retry-safe key: the same key returns the same sandbox.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Create Sandbox",
        summary:
            "Start an isolated Linux cloud sandbox; it bills by the second until destroyed.",
        description: "Create an isolated Linux sandbox on the best available " +
            "provider, or the one you name. Returns its id, the provider " +
            "it was placed on, and its rate. The sandbox bills by the " +
            "second until /destroy-sandbox or its timeout (default 30 " +
            "minutes); running commands, files and processes in it is " +
            "free. Use /get-quote first to see the price.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/create-sandbox",
    request: { method: "POST", path: "/api/v1/sandboxes" },
    input: {
        schema: { body: zCreateSandboxBody },
    },
    resources: {
        provisions: [{
            id: "computesdk/sandbox",
            seed: ({ data, utils }) => {
                const $ = utils.json;
                const out = data.output;
                const id = $.optionalStr(out, "$.sandbox.id");
                if (id === undefined) {
                    throw new Error(
                        "computesdk returned success but no readable sandbox id",
                    );
                }
                const provider = $.optionalStr(out, "$.sandbox.provider");
                const label = $.optionalStr(out, "$.sandbox.label");
                const body = (data.input.body ?? {}) as Record<string, unknown>;
                return {
                    resource: "computesdk/sandbox",
                    externalId: id,
                    identifier: label ?? id,
                    data: {
                        ...(provider !== undefined ? { provider } : {}),
                        ...(typeof body.size === "string"
                            ? { size: body.size }
                            : {}),
                        ...(typeof body.region === "string"
                            ? { region: body.region }
                            : {}),
                        ...(label !== undefined ? { label } : {}),
                    },
                };
            },
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
