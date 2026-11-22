import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zSandboxId } from "../../../schema/common.ts";
export const zKillProcessBody = z.object({
    sandboxId: zSandboxId,
    jobId: z.string().min(1).describe("The job id /start-process returned."),
    signal: z.string().max(32).optional().describe(
        "Signal name or number, e.g. SIGTERM, SIGKILL or 9.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Kill Process",
        summary: "Signal or stop a background process in your sandbox.",
        description: "Send a signal to a background process in one of YOUR " +
            "sandboxes, stopping it without destroying the sandbox. The " +
            "answer is the process as it was when signalled; poll " +
            "/get-process to see it exit.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/kill-process",
    request: {
        method: "POST",
        path: "/api/v1/sandboxes/{sandboxId}/processes/{jobId}/kill",
    },
    input: {
        schema: { body: zKillProcessBody },
        toRequest: ({ data }) => {
            const b = data.input.body as Record<string, unknown>;
            const { sandboxId, jobId, ...rest } = b;
            return {
                pathParams: {
                    sandboxId: String(sandboxId),
                    jobId: String(jobId),
                },
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
