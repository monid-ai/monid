import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAbsolutePath, zSandboxId } from "../../../schema/common.ts";
export const zReadFileBody = z.object({
    sandboxId: zSandboxId,
    path: zAbsolutePath,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Read File",
        summary: "Read a file, or list a directory, in your sandbox.",
        description:
            "Read a file's text content, or list a directory's entries, " +
            "at an absolute path in one of YOUR sandboxes.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/read-file",
    request: { method: "GET", path: "/api/v1/sandboxes/{sandboxId}/files" },
    input: {
        schema: { body: zReadFileBody },
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
