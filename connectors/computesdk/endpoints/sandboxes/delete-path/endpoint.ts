import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAbsolutePath, zSandboxId } from "../../../schema/common.ts";
export const zDeletePathBody = z.object({
    sandboxId: zSandboxId,
    path: zAbsolutePath,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Delete Path",
        summary: "Delete a file or a directory tree in your sandbox.",
        description: "Remove the file, or the whole directory tree, at an " +
            "absolute path in one of YOUR sandboxes.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/delete-path",
    request: { method: "DELETE", path: "/api/v1/sandboxes/{sandboxId}/files" },
    input: {
        schema: { body: zDeletePathBody },
        toRequest: ({ data }) => {
            const b = data.input.body as Record<string, unknown>;
            return {
                pathParams: { sandboxId: String(b.sandboxId) },
                queryParams: { path: String(b.path) },
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
