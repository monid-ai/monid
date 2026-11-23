import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxId } from "../../../schema/common.ts";
export const zGetProcessBody = z.object({
    sandboxId: zSandboxId,
    jobId: z.string().min(1).describe("The job id /start-process returned."),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Get Process",
        summary: "A background process's status, exit code and output so far.",
        description: "Check a background process in one of YOUR sandboxes: " +
            "whether it is still running, its exit code once done, and " +
            "its stdout and stderr so far.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/get-process",
    request: {
        method: "GET",
        path: "/api/v1/sandboxes/{sandboxId}/processes/{jobId}",
    },
    input: {
        schema: { body: zGetProcessBody },
        toRequest: ({ data }) => {
            const b = data.input.body as Record<string, unknown>;
            return {
                pathParams: {
                    sandboxId: String(b.sandboxId),
                    jobId: String(b.jobId),
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
