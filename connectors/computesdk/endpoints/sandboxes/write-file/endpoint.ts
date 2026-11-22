import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zAbsolutePath, zSandboxId } from "../../../schema/common.ts";
export const zWriteFileBody = z.object({
    sandboxId: zSandboxId,
    path: zAbsolutePath,
    content: z.string().optional().describe("The file's text content."),
    mkdir: z.boolean().optional().describe(
        "true: create a directory at path instead of a file.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Write File",
        summary: "Write a file, or make a directory, in your sandbox.",
        description: "Write text content to an absolute path in one of YOUR " +
            "sandboxes, replacing any file there, or create a directory " +
            "with mkdir: true.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/write-file",
    request: { method: "POST", path: "/api/v1/sandboxes/{sandboxId}/files" },
    input: {
        schema: { body: zWriteFileBody },
        toRequest: ({ data }) => {
            const b = data.input.body as Record<string, unknown>;
            const { sandboxId, ...rest } = b;
            return {
                pathParams: { sandboxId: String(sandboxId) },
                body: rest as Json,
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
