import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxId } from "../../../schema/common.ts";
export const zDestroySandboxBody = z.object({ sandboxId: zSandboxId }).strict();

export default defineEndpoint({
    meta: {
        displayName: "Destroy Sandbox",
        summary:
            "Stop and delete a sandbox; billing stops and its final cost is returned.",
        description:
            "Destroy one of YOUR sandboxes. Billing stops now; the answer " +
            "carries the sandbox's final runtime and cost. Files in the " +
            "sandbox are gone afterwards, so read what you need first.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/destroy-sandbox",
    request: { method: "DELETE", path: "/api/v1/sandboxes/{sandboxId}" },
    input: {
        schema: { body: zDestroySandboxBody },
        toRequest: ({ data }) => {
            const b = data.input.body as Record<string, unknown>;
            return { pathParams: { sandboxId: String(b.sandboxId) } };
        },
    },
    resources: {
        releases: [{
            id: "computesdk/sandbox",
            key: "$.body.sandboxId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
