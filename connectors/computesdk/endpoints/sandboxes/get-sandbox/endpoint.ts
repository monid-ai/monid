import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxId } from "../../../schema/common.ts";
export const zGetSandboxBody = z.object({ sandboxId: zSandboxId }).strict();

export default defineEndpoint({
    meta: {
        displayName: "Get Sandbox",
        summary:
            "One of your sandboxes: status, provider, rate and cost so far.",
        description:
            "Read one of YOUR sandboxes: whether it is creating, running " +
            "or destroyed, the provider it runs on, its rate, how long it " +
            "has run and what it has cost so far.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/get-sandbox",
    request: { method: "GET", path: "/api/v1/sandboxes/{sandboxId}" },
    input: {
        schema: { body: zGetSandboxBody },
        toRequest: ({ data }) => {
            const b = data.input.body as Record<string, unknown>;
            return { pathParams: { sandboxId: String(b.sandboxId) } };
        },
    },
    resources: {
        reads: [{
            id: "computesdk/sandbox",
            key: "$.body.sandboxId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
