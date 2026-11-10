import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zStartSandboxBody } from "./schema/inputs.ts";

/**
 * /start-sandbox — wake a stopped VM (upstream:
 * `POST /api/v2/sandboxes/{id}/start`). BoxCompute answers once it runs:
 * about 30 s from cold (33 s measured 2026-10-26).
 */
export default defineEndpoint({
    meta: {
        displayName: "Start VM",
        summary: "Start one of your stopped VMs, with its /workspace files.",
        description:
            "Start a stopped VM you own and wait until it runs, about 30 " +
            "s. Files under /workspace are as they were; processes from " +
            "before the stop are not. A running VM answers at once.",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
        notes: [
            "Running this STARTS BILLING again: the VM bills per second " +
            "(at least one minute) until it stops.",
            "Not needed before /run-command or /list-files, which wake a " +
            "stopped VM themselves.",
        ],
    },
    endpoint: "/start-sandbox",
    request: { method: "POST", path: "/api/v2/sandboxes/{id}/start" },
    input: {
        schema: { body: zStartSandboxBody },
        toRequest: ({ data }) => ({
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).sandboxId,
                ),
            },
            body: {},
        }),
    },
    timeouts: { requestMs: 120_000, runMs: 130_000 },
    resources: {
        uses: [{ id: "boxcompute/vm", key: "$.body.sandboxId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
