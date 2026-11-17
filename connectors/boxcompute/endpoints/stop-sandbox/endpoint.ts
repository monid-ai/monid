import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zStopSandboxBody } from "./schema/inputs.ts";

/**
 * /stop-sandbox — stop a running VM now, keeping its files (upstream:
 * `POST /api/v2/sandboxes/{id}/stop`). Never wakes a stopped VM; `stopped`
 * is false when it was not running.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stop VM",
        summary:
            "Stop one of your VMs now: billing stops, /workspace files are kept.",
        description:
            "Stop a running VM you own without waiting for its 30-minute " +
            "idle stop. Billing stops; files under /workspace are kept; " +
            "running processes end. stopped is false when the VM was not " +
            "running. /start-sandbox, /run-command or /list-files wake it " +
            "again.",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
        notes: [
            "409 SANDBOX_UNAVAILABLE right after a command means the VM is " +
            "still busy; try again a few seconds later.",
        ],
    },
    endpoint: "/stop-sandbox",
    request: { method: "POST", path: "/api/v2/sandboxes/{id}/stop" },
    input: {
        schema: { body: zStopSandboxBody },
        toRequest: ({ data }) => ({
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).sandboxId,
                ),
            },
            body: {},
        }),
    },
    resources: {
        uses: [{ id: "boxcompute/vm", key: "$.body.sandboxId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
