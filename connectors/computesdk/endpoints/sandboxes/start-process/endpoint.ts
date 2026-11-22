import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zEnv, zSandboxId } from "../../../schema/common.ts";
export const zStartProcessBody = z.object({
    sandboxId: zSandboxId,
    command: z.string().min(1).describe(
        "A shell command to run in the background, e.g. npm run dev.",
    ),
    cwd: z.string().optional().describe("The working directory."),
    env: zEnv,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Start Process",
        summary: "Start a long-running background process in your sandbox.",
        description:
            "Start a command in the background in one of YOUR sandboxes " +
            "and return at once with its job id: servers, builds and " +
            "anything longer than /run-command's 290 seconds. Check it " +
            "with /get-process.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/start-process",
    request: {
        method: "POST",
        path: "/api/v1/sandboxes/{sandboxId}/processes",
    },
    input: {
        schema: { body: zStartProcessBody },
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
