import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zEnv, zSandboxId } from "../../../schema/common.ts";
export const zRunCommandBody = z.object({
    sandboxId: zSandboxId,
    command: z.string().min(1).describe(
        "A shell command, e.g. python main.py.",
    ),
    cwd: z.string().optional().describe("The working directory."),
    timeoutMs: z.number().int().positive().max(290_000).optional().describe(
        "Fail the command after this many ms (max 290000).",
    ),
    env: zEnv,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Run Command",
        summary:
            "Run a shell command in your sandbox and get its exit code, stdout and stderr.",
        description:
            "Run a shell command in one of YOUR sandboxes and wait for it " +
            "to finish (up to 290 seconds). Returns the exit code, stdout, " +
            "stderr and duration. For longer work use /start-process. The " +
            "command itself is free; the sandbox bills by the second it " +
            "runs.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/run-command",
    request: {
        method: "POST",
        path: "/api/v1/sandboxes/{sandboxId}/commands",
        // The route streams SSE by default; JSON gets the buffered result.
        headers: { Accept: "application/json" },
    },
    input: {
        schema: { body: zRunCommandBody },
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
