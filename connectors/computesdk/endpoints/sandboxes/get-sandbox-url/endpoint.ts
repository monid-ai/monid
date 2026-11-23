import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxId } from "../../../schema/common.ts";
export const zSandboxUrlBody = z.object({
    sandboxId: zSandboxId,
    port: z.number().int().min(1).max(65535).describe(
        "The port your server listens on.",
    ),
    protocol: z.enum(["http", "tcp"]).default("http").describe("http or tcp."),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Get Sandbox URL",
        summary: "A public URL for a port your sandbox serves.",
        description: "Get a public URL that reaches a port in one of YOUR " +
            "sandboxes, e.g. a dev server started with /start-process.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/get-sandbox-url",
    request: { method: "GET", path: "/api/v1/sandboxes/{sandboxId}/urls" },
    input: {
        schema: { body: zSandboxUrlBody },
        toRequest: ({ data }) => {
            const b = data.input.body as Record<string, unknown>;
            return {
                pathParams: { sandboxId: String(b.sandboxId) },
                queryParams: {
                    port: String(b.port),
                    protocol: String(b.protocol ?? "http"),
                },
            };
        },
    },
    resources: {
        uses: [{
            id: "computesdk/sandbox",
            key: "$.body.sandboxId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
