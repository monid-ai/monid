import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxPathParams } from "../../schema/common.ts";

/**
 * /wake-sandbox — restore a sleeping sandbox now rather than on the next
 * exec (upstream `POST /v1/sandboxes/{id}/wake`, worker `wakeSandbox`).
 * USES binding: ownership pre-gate + a reconcile mark (compute restarts).
 */
export default defineEndpoint({
    meta: {
        displayName: "Wake Sandbox",
        summary:
            "Restore your sleeping sandbox now, ahead of the next command.",
        description:
            "Wake one of YOUR sleeping sandboxes from its snapshot so the " +
            "next command does not wait for the restore. Returns the " +
            "sandbox object and `wake_ms`, how long the restore took. " +
            "Waking a running sandbox is a no-op (`wake_ms: 0`). An /exec " +
            "on a sleeping sandbox wakes it anyway, so this is optional.",
        docsUrl: "https://docs.kosa8.com/guides/cloud.html",
        categories: ["code-execution"],
        notes: [
            "Waking restarts the per-second compute meter.",
            "A sandbox that is neither sleeping nor running answers 409 " +
            "not_sleeping; a failed restore answers 502/503 wake_failed " +
            "and leaves it asleep — retry.",
        ],
    },
    endpoint: "/wake-sandbox",
    request: { method: "POST", path: "/v1/sandboxes/{id}/wake" },
    input: { schema: { pathParams: zSandboxPathParams } },
    resources: {
        uses: [{ id: "kosa8/sandbox", key: "$.pathParams.id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
